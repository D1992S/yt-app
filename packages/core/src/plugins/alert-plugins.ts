import { InsightPlugin, SyncContext, Insight } from './types';
import { repo } from '../db/repo';

// 1. CTR Drop Alert
export class CtrDropPlugin implements InsightPlugin {
  name = 'CtrDrop';
  async analyze(ctx: SyncContext): Promise<Insight[]> {
    const stats = ctx.repo.getChannelStats(ctx.channelId, ctx.range.start, ctx.range.end);
    if (stats.length < 2) return [];

    // Compare last 3 days vs previous 3 days
    const recent = stats.slice(-3);
    const prev = stats.slice(-6, -3);

    if (prev.length < 3) return [];

    const recentImp = recent.reduce((a: number, b: any) => a + (b.impressions || 0), 0);
    const recentViews = recent.reduce((a: number, b: any) => a + b.views, 0);
    const prevImp = prev.reduce((a: number, b: any) => a + (b.impressions || 0), 0);
    const prevViews = prev.reduce((a: number, b: any) => a + b.views, 0);

    if (recentImp === 0 || prevImp === 0) return [];

    const recentCtr = (recentViews / recentImp) * 100;
    const prevCtr = (prevViews / prevImp) * 100;

    if (recentCtr < prevCtr * 0.8) { // 20% drop
      const action = {
        title: 'Fix CTR Drop',
        steps: [
          'Check thumbnail contrast and readability.',
          'Verify title matches thumbnail promise.',
          'A/B test a new title variant.'
        ]
      };

      repo.insertAlert({
        severity: 'high',
        message: `CTR dropped by ${((prevCtr - recentCtr) / prevCtr * 100).toFixed(1)}% in last 3 days.`,
        entity_id: ctx.channelId,
        action_json: JSON.stringify(action)
      });

      return [{
        type: 'alert_ctr',
        title: 'CTR Drop Alert',
        description: 'Significant drop in Click-Through Rate detected.',
        evidence: { recentCtr, prevCtr }
      }];
    }
    return [];
  }
}

// 2. Competitor Hit in Gap
export class CompetitorGapHitPlugin implements InsightPlugin {
  name = 'CompetitorGapHit';
  async analyze(ctx: SyncContext): Promise<Insight[]> {
    // Get recent competitor hits
    const hits = repo.getCompetitorHits(3); // Last 3 days
    // Get gaps
    const gaps = repo.getTopicClustersWithGaps().filter((g: any) => g.gap_score > 5);

    for (const hit of hits) {
      // In a real app, we'd check if the hit video belongs to a gap cluster
      // For V1, we simulate a match if the hit title contains gap keywords
      // This requires fetching cluster keywords, simplified here
      
      const isMatch = gaps.some((g: any) => hit.title.toLowerCase().includes(g.name.split(',')[0])); // Simple check
      
      if (isMatch) {
        const action = {
          title: 'Counter Competitor Hit',
          steps: [
            `Watch competitor video: ${hit.title}`,
            'Identify missing angles or outdated info.',
            'Script a response or "better version" video.'
          ]
        };

        repo.insertAlert({
          severity: 'medium',
          message: `Competitor hit detected in your content gap: ${hit.title}`,
          entity_id: hit.video_id,
          action_json: JSON.stringify(action)
        });
      }
    }
    return [];
  }
}
