import { ChannelDTO, VideoDTO, MetricRow, Range } from '@insight/shared';

export interface DataProvider {
  getChannel(channelId: string): Promise<ChannelDTO>;
  listVideos(channelId: string, maxResults?: number): Promise<VideoDTO[]>;
  
  // Competitor / Public Data
  getPublicChannel(channelId: string): Promise<ChannelDTO>;
  getPublicVideos(channelId: string, maxResults?: number): Promise<VideoDTO[]>;
}

export interface AnalyticsProvider {
  getChannelDailyMetrics(channelId: string, range: Range): Promise<MetricRow[]>;
  getVideoDailyMetrics(videoIds: string[], range: Range): Promise<Record<string, MetricRow[]>>;
}

export interface ReportingProvider {
  // Stub for future implementation
  generateReport(data: any): Promise<string>;
}

export interface IApiProvider extends DataProvider, AnalyticsProvider {}
