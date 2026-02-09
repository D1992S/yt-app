import fs from 'fs';
import path from 'path';
import { IApiProvider } from '../interfaces';
import { ChannelDTO, VideoDTO, MetricRow, Range, getDaysBetween, formatDateISO, addDays } from '@insight/shared';

export class FakeProvider implements IApiProvider {
  private fixturesDir: string;

  constructor(fixturesDir: string) {
    this.fixturesDir = fixturesDir;
  }

  private readFixture<T>(filename: string, fallback: T): T {
    const filePath = path.join(this.fixturesDir, filename);
    if (fs.existsSync(filePath)) {
      try {
        return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      } catch (e) {
        console.error(`Error reading fixture ${filename}`, e);
      }
    }
    return fallback;
  }

  async getChannel(channelId: string): Promise<ChannelDTO> {
    return this.readFixture<ChannelDTO>(`channel_${channelId}.json`, {
      id: channelId,
      title: 'Fake Channel (Fallback)',
      subscriberCount: 1000,
      createdAt: '2020-01-01T00:00:00Z'
    });
  }

  async listVideos(channelId: string, maxResults: number = 10): Promise<VideoDTO[]> {
    return this.readFixture<VideoDTO[]>(`videos_${channelId}.json`, Array.from({ length: 5 }).map((_, i) => ({
      id: `video_${i}`,
      title: `Fake Video ${i}`,
      views: 100 * i,
      publishedAt: new Date().toISOString(),
      durationSec: 600
    })));
  }

  async getChannelDailyMetrics(channelId: string, range: Range): Promise<MetricRow[]> {
    const fallback: MetricRow[] = [];
    const dayCount = getDaysBetween(range.dateFrom, range.dateTo);
    let curr = new Date(range.dateFrom);
    
    for(let i=0; i<=dayCount; i++) {
      fallback.push({
        date: formatDateISO(curr),
        metric: 'views',
        value: Math.floor(Math.random() * 1000)
      });
      curr = addDays(curr, 1);
    }

    return this.readFixture<MetricRow[]>(`metrics_channel_${channelId}.json`, fallback);
  }

  async getVideoDailyMetrics(videoIds: string[], range: Range): Promise<Record<string, MetricRow[]>> {
    const result: Record<string, MetricRow[]> = {};
    for (const vid of videoIds) {
      result[vid] = await this.getChannelDailyMetrics(vid, range); 
    }
    return this.readFixture<Record<string, MetricRow[]>>(`metrics_videos.json`, result);
  }

  // --- Competitor / Public Data Fakes ---

  async getPublicChannel(channelId: string): Promise<ChannelDTO> {
    return {
      id: channelId,
      title: `Competitor ${channelId}`,
      subscriberCount: 50000,
      createdAt: '2022-01-01T00:00:00Z'
    };
  }

  async getPublicVideos(channelId: string, maxResults: number = 20): Promise<VideoDTO[]> {
    // Generate 20 videos with varying "viral" potential
    return Array.from({ length: maxResults }).map((_, i) => {
      const isViral = i % 5 === 0; // Every 5th video is viral
      const baseViews = isViral ? 50000 : 1000;
      return {
        id: `comp_${channelId}_vid_${i}`,
        title: `Competitor Video ${i} ${isViral ? '(VIRAL)' : ''}`,
        views: baseViews,
        publishedAt: new Date(Date.now() - i * 86400000).toISOString(), // 1 video per day
        durationSec: 300
      };
    });
  }
}
