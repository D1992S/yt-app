import { InsightPlugin, SyncContext, Insight } from './types';

// 1. Top Movers
export class TopMoversPlugin implements InsightPlugin {
  name = 'TopMovers';
  async analyze(ctx: SyncContext): Promise<Insight[]> {
    const videos = ctx.repo.getAllVideos();
    const movers: any[] = [];

    for (const v of videos) {
      const stats = ctx.repo.getVideoStats(v.video_id, ctx.range.start, ctx.range.end);
      if (stats.length < 2) continue;
      
      const first = stats[0].views;
      const last = stats[stats.length - 1].views;
      const total = stats.reduce((a: number, b: any) => a + b.views, 0);
      
      if (total > 100) { // Threshold
        movers.push({ title: v.title, total });
      }
    }

    movers.sort((a, b) => b.total - a.total);
    const top3 = movers.slice(0, 3);

    if (top3.length === 0) return [];

    return [{
      type: 'top_movers',
      title: 'Top Performing Videos',
      description: `Top 3 videos by views in this period: ${top3.map(m => m.title).join(', ')}`,
      evidence: top3
    }];
  }
}

// 2. Bottleneck Funnel
export class BottleneckPlugin implements InsightPlugin {
  name = 'Bottleneck';
  async analyze(ctx: SyncContext): Promise<Insight[]> {
    const stats = ctx.repo.getChannelStats(ctx.channelId, ctx.range.start, ctx.range.end);
    const impressions = stats.reduce((a: number, b: any) => a + (b.impressions || 0), 0);
    const views = stats.reduce((a: number, b: any) => a + b.views, 0);
    
    if (impressions === 0) return [];

    const ctr = (views / impressions) * 100;
    
    if (ctr < 2.0) {
      return [{
        type: 'bottleneck',
        title: 'Low CTR Detected',
        description: `CTR is ${ctr.toFixed(1)}%, which is below the 2% benchmark. Consider improving thumbnails.`,
        evidence: { impressions, views, ctr }
      }];
    }
    return [];
  }
}

// 3. Source Shift (Stub)
export class SourceShiftPlugin implements InsightPlugin {
  name = 'SourceShift';
  async analyze(ctx: SyncContext): Promise<Insight[]> {
    // Requires breakdown data not currently in schema
    return []; 
  }
}

// 4. Anomaly Days
export class AnomalyDaysPlugin implements InsightPlugin {
  name = 'AnomalyDays';
  async analyze(ctx: SyncContext): Promise<Insight[]> {
    const stats = ctx.repo.getChannelStats(ctx.channelId, ctx.range.start, ctx.range.end);
    const values = stats.map((s: any) => s.views);
    if (values.length < 5) return [];

    const mean = values.reduce((a: number, b: number) => a + b, 0) / values.length;
    const stdDev = Math.sqrt(values.reduce((a: number, b: number) => a + Math.pow(b - mean, 2), 0) / values.length);

    const anomalies = stats.filter((s: any) => Math.abs(s.views - mean) > 2 * stdDev);

    if (anomalies.length > 0) {
      return [{
        type: 'anomaly',
        title: 'Traffic Anomalies Detected',
        description: `Found ${anomalies.length} days with unusual traffic patterns.`,
        evidence: anomalies.map((a: any) => ({ day: a.day, views: a.views }))
      }];
    }
    return [];
  }
}

// 5. Sleepers
export class SleepersPlugin implements InsightPlugin {
  name = 'Sleepers';
  async analyze(ctx: SyncContext): Promise<Insight[]> {
    const videos = ctx.repo.getAllVideos();
    const sleepers: any[] = [];
    const now = new Date();

    for (const v of videos) {
      const pubDate = new Date(v.published_at);
      const ageDays = (now.getTime() - pubDate.getTime()) / (1000 * 3600 * 24);
      
      if (ageDays > 90) {
        const stats = ctx.repo.getVideoStats(v.video_id, ctx.range.start, ctx.range.end);
        const recentViews = stats.reduce((a: number, b: any) => a + b.views, 0);
        if (recentViews > 500) { // Arbitrary threshold for "waking up"
           sleepers.push({ title: v.title, recentViews, ageDays });
        }
      }
    }

    if (sleepers.length > 0) {
      return [{
        type: 'sleepers',
        title: 'Sleeper Videos',
        description: `${sleepers.length} older videos are gaining traction.`,
        evidence: sleepers.slice(0, 5)
      }];
    }
    return [];
  }
}

// 6. Quality Ranking V1
export class QualityRankingPlugin implements InsightPlugin {
  name = 'QualityRanking';
  async analyze(ctx: SyncContext): Promise<Insight[]> {
    const videos = ctx.repo.getAllVideos();
    const scores: any[] = [];

    for (const v of videos) {
      const stats = ctx.repo.getVideoStats(v.video_id, ctx.range.start, ctx.range.end);
      const views = stats.reduce((a: number, b: any) => a + b.views, 0);
      const likes = stats.reduce((a: number, b: any) => a + (b.likes || 0), 0);
      const comments = stats.reduce((a: number, b: any) => a + (b.comments || 0), 0);

      // Simple heuristic score
      const score = (views * 0.1) + (likes * 10) + (comments * 20);
      if (score > 0) {
        scores.push({ title: v.title, score });
      }
    }

    scores.sort((a, b) => b.score - a.score);
    const top = scores.slice(0, 5);

    if (top.length > 0) {
      return [{
        type: 'quality_rank',
        title: 'Quality Ranking (V1)',
        description: 'Top videos based on engagement weighted score.',
        evidence: top
      }];
    }
    return [];
  }
}
