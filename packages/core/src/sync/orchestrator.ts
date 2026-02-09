import { IApiProvider } from '@insight/api';
import { repo, meta, perf, calculateMomentum } from '../index';
import { Range, SyncStatus, SyncStage, addDays, formatDateISO, AppError } from '@insight/shared';
import { pluginManager } from '../plugins/registry';
import { fitGrowthCurves } from '@insight/ml';
import { calculateQualityScore } from '../analytics/quality-score';

export interface SyncProgress {
  stage: SyncStage;
  progress: number; // 0-100
  message: string;
}

export class SyncOrchestrator {
  private api: IApiProvider;
  private onProgress: (p: SyncProgress) => void;
  private isRunning = false;

  constructor(api: IApiProvider, onProgress: (p: SyncProgress) => void) {
    this.api = api;
    this.onProgress = onProgress;
  }

  private update(stage: SyncStage, progress: number, message: string) {
    this.onProgress({ stage, progress, message });
  }

  private saveCheckpoint(stage: string) {
    meta.set('sync_checkpoint', stage);
  }

  async run(requestedRange: Range): Promise<void> {
    if (this.isRunning) throw new AppError('SYNC_FAILED', "Sync already running", false);
    this.isRunning = true;

    const runId = Date.now();
    this.logRun(runId, 'active', 'started');

    try {
      await perf.measure('sync_full_run', async () => {
        const now = new Date();
        const todayStr = formatDateISO(now);
        const last21Days = addDays(now, -21);

        const syncStart = requestedRange.dateFrom < last21Days ? requestedRange.dateFrom : last21Days;
        const syncRange: Range = {
          dateFrom: syncStart,
          dateTo: now,
          preset: 'custom'
        };

        const snapshotRunId = repo.createSnapshotRun('daily_sync');

        // Stage 1: Channel Profile
        this.update('fetching', 10, 'Syncing Channel Profile...');
        const channel = await perf.measure('sync_stage_channel', async () => {
          const c = await this.api.getChannel('MINE');
          repo.upsertChannel({
            channel_id: c.id,
            title: c.title,
            created_at: c.createdAt,
            raw_json: JSON.stringify(c)
          });
          return c;
        });
        this.saveCheckpoint('channel_profile');

        // Stage 2: Videos Metadata
        this.update('fetching', 20, 'Syncing Video Metadata...');
        const videos = await perf.measure('sync_stage_videos_meta', async () => {
          const vids = await this.api.listVideos('MINE', 50);
          const batch = vids.map(v => ({
            video_id: v.id,
            channel_id: channel.id,
            title: v.title,
            published_at: v.publishedAt,
            duration_sec: v.durationSec,
            raw_json: JSON.stringify(v)
          }));
          repo.upsertVideosBatch(batch);
          return vids;
        });
        this.saveCheckpoint('video_metadata');

        // Stage 3: Channel Metrics
        this.update('processing', 40, 'Syncing Channel Metrics...');
        await perf.measure('sync_stage_channel_metrics', async () => {
          const channelMetrics = await this.api.getChannelDailyMetrics(channel.id, syncRange);
          const channelDayMap = new Map<string, any>();
          channelMetrics.forEach(m => {
            if (!channelDayMap.has(m.date)) channelDayMap.set(m.date, { channel_id: channel.id, day: m.date });
            const entry = channelDayMap.get(m.date);
            if (m.metric === 'views') entry.views = m.value;
            if (m.metric === 'estimatedMinutesWatched') entry.watch_time_minutes = m.value;
            if (m.metric === 'averageViewDuration') entry.avg_view_duration_sec = m.value;
            if (m.metric === 'subscribersGained') entry.subs_gained = m.value;
            if (m.metric === 'subscribersLost') entry.subs_lost = m.value;
          });
          const facts = Array.from(channelDayMap.values()).map(f => ({ ...f, impressions: 0, ctr: 0 }));
          repo.upsertChannelDaysBatch(facts);
          repo.saveSnapshotItems(snapshotRunId, facts.map(f => ({
            scope: 'channel',
            entity_id: channel.id,
            day: f.day,
            kind: 'metrics',
            payload_json: JSON.stringify(f)
          })));
        });
        this.saveCheckpoint('channel_metrics');

        // Stage 4: Video Metrics
        this.update('processing', 60, 'Syncing Video Metrics...');
        await perf.measure('sync_stage_video_metrics', async () => {
          const videoIds = videos.map(v => v.id);
          const videoMetricsMap = await this.api.getVideoDailyMetrics(videoIds, syncRange);
          const allFacts: any[] = [];
          for (const [vid, metrics] of Object.entries(videoMetricsMap)) {
            const vidDayMap = new Map<string, any>();
            metrics.forEach(m => {
              if (!vidDayMap.has(m.date)) vidDayMap.set(m.date, { video_id: vid, day: m.date });
              const entry = vidDayMap.get(m.date);
              if (m.metric === 'views') entry.views = m.value;
              if (m.metric === 'likes') entry.likes = m.value;
              if (m.metric === 'comments') entry.comments = m.value;
            });
            for (const fact of vidDayMap.values()) {
              allFacts.push({ ...fact, watch_time_minutes: 0, avg_view_duration_sec: 0, impressions: 0, ctr: 0 });
            }
          }
          if (allFacts.length > 0) {
            repo.upsertVideoDaysBatch(allFacts);
            repo.saveSnapshotItems(snapshotRunId, allFacts.map(f => ({
              scope: 'video',
              entity_id: f.video_id,
              day: f.day,
              kind: 'metrics',
              payload_json: JSON.stringify(f)
            })));
          }
        });
        this.saveCheckpoint('video_metrics');

        // Stage 4.5: Nowcast & Quality Scores
        this.update('processing', 70, 'Calculating Nowcast & Quality...');
        await perf.measure('sync_stage_advanced_analytics', async () => {
          const allVideos = repo.getAllVideos();
          const allDailyViews = repo.getAllVideoDailyViews('2000-01-01', '2099-12-31');
          
          const viewsMap = new Map<string, number[]>();
          for (const row of allDailyViews) {
            if (!viewsMap.has(row.video_id)) viewsMap.set(row.video_id, []);
            viewsMap.get(row.video_id)!.push(row.views);
          }

          const videoDataForCurves = allVideos.map(v => ({
            id: v.video_id,
            durationSec: v.duration_sec || 0,
            dailyViews: viewsMap.get(v.video_id) || []
          }));
          
          const curves = fitGrowthCurves(videoDataForCurves);
          curves.forEach(c => {
            repo.upsertGrowthCurve({
              cluster_id: 0,
              duration_bucket: 'all',
              day_number: c.day,
              median_pct: c.medianPct,
              p25_pct: c.p25Pct,
              p75_pct: c.p75Pct
            });
          });

          for (const v of allVideos) {
            calculateQualityScore(v.video_id);
          }
        });

        // Stage 5: Competitors
        this.update('fetching', 80, 'Syncing Competitors...');
        await perf.measure('sync_stage_competitors', async () => {
          const competitors = repo.getCompetitors();
          for (const comp of competitors) {
            const compVideos = await this.api.getPublicVideos(comp.channel_id, 20);
            for (const v of compVideos) {
              repo.upsertCompetitorVideo({
                video_id: v.id,
                channel_id: comp.channel_id,
                title: v.title,
                published_at: v.publishedAt
              });
              repo.upsertCompetitorSnapshot({
                video_id: v.id,
                day: todayStr,
                view_count: v.views
              });
              calculateMomentum(v.id, todayStr);
            }
          }
        });
        this.saveCheckpoint('competitors');

        // Stage 6: Plugins
        this.update('processing', 95, 'Running Insights Plugins...');
        await pluginManager.runAll({
          runId: snapshotRunId,
          channelId: channel.id,
          range: { start: formatDateISO(syncRange.dateFrom), end: formatDateISO(syncRange.dateTo) },
          repo: repo
        });

        this.update('saving', 100, 'Sync Complete');
        this.logRun(runId, 'success', 'Completed successfully');
        this.saveCheckpoint('complete');
      });
      
    } catch (e) {
      console.error(e);
      this.update('init', 0, 'Sync Failed');
      this.logRun(runId, 'error', (e as Error).message);
      // Wrap in AppError if not already
      throw AppError.from(e);
    } finally {
      this.isRunning = false;
    }
  }

  private logRun(id: number, status: string, message: string) {
    meta.set('last_sync_status', status);
    meta.set('last_sync_time', new Date().toISOString());
  }
}
