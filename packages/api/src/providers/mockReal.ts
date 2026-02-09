import { IApiProvider } from '../interfaces';
import { ChannelDTO, VideoDTO, MetricRow, Range } from '@insight/shared';

// This simulates the "Real" API (e.g. YouTube) for the purpose of testing the Recorder
export class MockRealProvider implements IApiProvider {
  async getChannel(channelId: string): Promise<ChannelDTO> {
    await new Promise(r => setTimeout(r, 500)); // Network latency
    return {
      id: channelId,
      title: `Real Channel ${channelId}`,
      subscriberCount: 50000,
      createdAt: '2015-05-20T10:00:00Z'
    };
  }

  async listVideos(channelId: string, maxResults: number = 10): Promise<VideoDTO[]> {
    await new Promise(r => setTimeout(r, 500));
    return Array.from({ length: 3 }).map((_, i) => ({
      id: `real_vid_${i}`,
      title: `Real Video Content ${i}`,
      views: 5000 + (i * 100),
      publishedAt: new Date().toISOString(),
      durationSec: 300
    }));
  }

  async getChannelDailyMetrics(channelId: string, range: Range): Promise<MetricRow[]> {
    await new Promise(r => setTimeout(r, 500));
    return [
      { date: '2023-01-01', metric: 'views', value: 1200 },
      { date: '2023-01-02', metric: 'views', value: 1350 }
    ];
  }

  async getVideoDailyMetrics(videoIds: string[], range: Range): Promise<Record<string, MetricRow[]>> {
    await new Promise(r => setTimeout(r, 500));
    const res: Record<string, MetricRow[]> = {};
    videoIds.forEach(id => {
      res[id] = [{ date: '2023-01-01', metric: 'views', value: 500 }];
    });
    return res;
  }
}
