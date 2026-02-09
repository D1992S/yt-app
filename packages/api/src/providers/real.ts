import { IApiProvider } from '../interfaces';
import { ChannelDTO, VideoDTO, MetricRow, Range, formatDateISO } from '@insight/shared';
import { HttpClient } from '../utils/http';
import { RateLimiter } from '../utils/rateLimiter';
import { RequestCache } from '../utils/cache';

export class RealProvider implements IApiProvider {
  private http: HttpClient;
  private limiter: RateLimiter;

  constructor(getAccessToken: () => Promise<string | null>, cache?: RequestCache) {
    this.http = new HttpClient(getAccessToken, cache);
    this.limiter = new RateLimiter(50, 5); 
  }

  async getChannel(channelId: string): Promise<ChannelDTO> {
    await this.limiter.waitForToken();
    const param = channelId === 'MINE' ? 'mine=true' : `id=${channelId}`;
    const url = `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics,contentDetails&${param}`;
    const data = await this.http.fetchWithRetry(url);
    
    if (!data.items || data.items.length === 0) throw new Error('Channel not found');
    const item = data.items[0];
    return {
      id: item.id,
      title: item.snippet.title,
      subscriberCount: parseInt(item.statistics.subscriberCount, 10),
      createdAt: item.snippet.publishedAt,
      uploadsPlaylistId: item.contentDetails.relatedPlaylists.uploads
    };
  }

  async listVideos(channelId: string, maxResults: number = 50): Promise<VideoDTO[]> {
    const channel = await this.getChannel(channelId);
    if (!channel.uploadsPlaylistId) return [];

    const videos: VideoDTO[] = [];
    let nextPageToken = '';
    let fetchedCount = 0;

    while (fetchedCount < maxResults) {
      await this.limiter.waitForToken();
      const plUrl = `https://www.googleapis.com/youtube/v3/playlistItems?part=contentDetails&playlistId=${channel.uploadsPlaylistId}&maxResults=50&pageToken=${nextPageToken}`;
      const plData = await this.http.fetchWithRetry(plUrl);

      if (!plData.items || plData.items.length === 0) break;

      const videoIds = plData.items.map((item: any) => item.contentDetails.videoId).join(',');

      await this.limiter.waitForToken();
      const vUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics,contentDetails&id=${videoIds}`;
      const vData = await this.http.fetchWithRetry(vUrl);

      for (const item of vData.items) {
        const durationStr = item.contentDetails.duration;
        const durationSec = this.parseDuration(durationStr);
        videos.push({
          id: item.id,
          title: item.snippet.title,
          views: parseInt(item.statistics.viewCount, 10),
          publishedAt: item.snippet.publishedAt,
          durationSec
        });
      }

      fetchedCount += vData.items.length;
      nextPageToken = plData.nextPageToken;
      if (!nextPageToken) break;
    }
    return videos.slice(0, maxResults);
  }

  async getChannelDailyMetrics(channelId: string, range: Range): Promise<MetricRow[]> {
    await this.limiter.waitForToken();
    const startDate = formatDateISO(range.dateFrom);
    const endDate = formatDateISO(range.dateTo);
    const metrics = 'views,estimatedMinutesWatched,averageViewDuration,subscribersGained,subscribersLost';
    const url = `https://youtubeanalytics.googleapis.com/v2/reports?ids=channel==MINE&startDate=${startDate}&endDate=${endDate}&metrics=${metrics}&dimensions=day&sort=day`;
    const data = await this.http.fetchWithRetry(url);
    return this.mapAnalyticsResponse(data);
  }

  async getVideoDailyMetrics(videoIds: string[], range: Range): Promise<Record<string, MetricRow[]>> {
    const startDate = formatDateISO(range.dateFrom);
    const endDate = formatDateISO(range.dateTo);
    const metrics = 'views,estimatedMinutesWatched,averageViewDuration,likes,comments';
    const result: Record<string, MetricRow[]> = {};
    const concurrency = 3;
    const queue = [...videoIds];
    
    const worker = async () => {
      while (queue.length > 0) {
        const videoId = queue.shift();
        if (!videoId) break;
        try {
          await this.limiter.waitForToken();
          const url = `https://youtubeanalytics.googleapis.com/v2/reports?ids=channel==MINE&filters=video==${videoId}&startDate=${startDate}&endDate=${endDate}&metrics=${metrics}&dimensions=day&sort=day`;
          const data = await this.http.fetchWithRetry(url);
          result[videoId] = this.mapAnalyticsResponse(data);
        } catch (e) {
          console.error(`Failed to fetch metrics for video ${videoId}`, e);
          result[videoId] = [];
        }
      }
    };
    await Promise.all(Array.from({ length: concurrency }).map(() => worker()));
    return result;
  }

  // --- Public Data Implementation ---
  async getPublicChannel(channelId: string): Promise<ChannelDTO> {
    return this.getChannel(channelId);
  }

  async getPublicVideos(channelId: string, maxResults: number = 20): Promise<VideoDTO[]> {
    return this.listVideos(channelId, maxResults);
  }

  private mapAnalyticsResponse(data: any): MetricRow[] {
    if (!data.rows || !data.columnHeaders) return [];
    const headers = data.columnHeaders.map((h: any) => h.name);
    const rows: MetricRow[] = [];
    for (const row of data.rows) {
      const date = row[0];
      for (let i = 1; i < headers.length; i++) {
        rows.push({ date, metric: headers[i], value: row[i] });
      }
    }
    return rows;
  }

  private parseDuration(duration: string): number {
    const match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
    if (!match) return 0;
    const hours = (parseInt(match[1] || '0') || 0);
    const minutes = (parseInt(match[2] || '0') || 0);
    const seconds = (parseInt(match[3] || '0') || 0);
    return hours * 3600 + minutes * 60 + seconds;
  }
}
