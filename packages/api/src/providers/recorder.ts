import fs from 'fs';
import path from 'path';
import { IApiProvider } from '../interfaces';
import { ChannelDTO, VideoDTO, MetricRow, Range } from '@insight/shared';

export class RecorderProvider implements IApiProvider {
  private realProvider: IApiProvider;
  private fixturesDir: string;

  constructor(realProvider: IApiProvider, fixturesDir: string) {
    this.realProvider = realProvider;
    this.fixturesDir = fixturesDir;
    
    if (!fs.existsSync(this.fixturesDir)) {
      fs.mkdirSync(this.fixturesDir, { recursive: true });
    }
  }

  private saveFixture(filename: string, data: any) {
    const filePath = path.join(this.fixturesDir, filename);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    console.log(`[Recorder] Saved fixture: ${filename}`);
  }

  async getChannel(channelId: string): Promise<ChannelDTO> {
    const data = await this.realProvider.getChannel(channelId);
    this.saveFixture(`channel_${channelId}.json`, data);
    return data;
  }

  async listVideos(channelId: string, maxResults?: number): Promise<VideoDTO[]> {
    const data = await this.realProvider.listVideos(channelId, maxResults);
    this.saveFixture(`videos_${channelId}.json`, data);
    return data;
  }

  async getChannelDailyMetrics(channelId: string, range: Range): Promise<MetricRow[]> {
    const data = await this.realProvider.getChannelDailyMetrics(channelId, range);
    this.saveFixture(`metrics_channel_${channelId}.json`, data);
    return data;
  }

  async getVideoDailyMetrics(videoIds: string[], range: Range): Promise<Record<string, MetricRow[]>> {
    const data = await this.realProvider.getVideoDailyMetrics(videoIds, range);
    this.saveFixture(`metrics_videos.json`, data);
    return data;
  }
}
