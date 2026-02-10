import { repo } from '../db/repo';

/**
 * Dynamic benchmark calculation using channel-level percentile data.
 * Falls back to hardcoded defaults if channel data is insufficient.
 */
const getDynamicBenchmarks = (channelStats: any[]) => {
  const defaults = { velocity: 100, efficiency: 3, conversion: 50 };
  if (channelStats.length < 5) return defaults;

  const velocities = channelStats.map((s: any) => s.views || 0).sort((a: number, b: number) => a - b);
  const efficiencies = channelStats
    .filter((s: any) => s.views > 0)
    .map((s: any) => (s.watch_time_minutes || 0) / s.views)
    .sort((a: number, b: number) => a - b);
  const conversions = channelStats
    .filter((s: any) => s.views > 0)
    .map((s: any) => ((s.likes || 0) + (s.comments || 0)) / s.views * 1000)
    .sort((a: number, b: number) => a - b);

  const p75 = (arr: number[]) => {
    if (arr.length === 0) return 0;
    const idx = Math.floor(arr.length * 0.75);
    return arr[idx] || arr[arr.length - 1];
  };

  return {
    velocity: p75(velocities) || defaults.velocity,
    efficiency: p75(efficiencies) || defaults.efficiency,
    conversion: p75(conversions) || defaults.conversion,
  };
};

/**
 * Sigmoid normalization for smoother scoring near boundaries.
 * Maps raw ratio to 0-100 using a logistic curve centered at 1.0.
 */
const sigmoidScore = (value: number, benchmark: number): number => {
  if (benchmark <= 0) return 0;
  const ratio = value / benchmark;
  // Logistic function: output 0-100, inflection at ratio=1.0, steepness=4
  return 100 / (1 + Math.exp(-4 * (ratio - 1)));
};

export const calculateQualityScore = (videoId: string) => {
  // 1. Fetch Data — last 28 days for this video
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 28);
  const dateFrom = start.toISOString().split('T')[0];
  const dateTo = end.toISOString().split('T')[0];

  const stats = repo.getVideoStats(videoId, dateFrom, dateTo);
  if (stats.length === 0) return;

  // 2. Fetch channel-level stats for dynamic benchmarking
  let channelStats: any[] = [];
  try {
    channelStats = repo.getChannelVideoStats?.(dateFrom, dateTo) || [];
  } catch {
    channelStats = [];
  }

  const benchmarks = getDynamicBenchmarks(channelStats);

  // 3. Calculate Components
  const totalViews = stats.reduce((a, b: any) => a + b.views, 0);
  const totalWatchTime = stats.reduce((a, b: any) => a + (b.watch_time_minutes || 0), 0);
  const totalEngagement = stats.reduce((a, b: any) => a + (b.likes || 0) + (b.comments || 0), 0);

  const days = stats.length;

  // A. Velocity (Views per Day)
  const velocity = totalViews / days;

  // B. Efficiency (Avg View Duration in Minutes)
  const efficiency = totalViews > 0 ? totalWatchTime / totalViews : 0;

  // C. Conversion (Engagement per 1000 views)
  const conversion = totalViews > 0 ? (totalEngagement / totalViews) * 1000 : 0;

  // D. Consistency — how stable are daily views (lower CV = more consistent)
  const dailyViews = stats.map((s: any) => s.views || 0);
  const avgDaily = dailyViews.reduce((a: number, b: number) => a + b, 0) / dailyViews.length;
  const variance = dailyViews.reduce((sum: number, v: number) => sum + Math.pow(v - avgDaily, 2), 0) / dailyViews.length;
  const cv = avgDaily > 0 ? Math.sqrt(variance) / avgDaily : 1;
  // Consistency score: CV of 0 = 100, CV of 2+ = ~0
  const consistencyScore = Math.max(0, Math.min(100, 100 * (1 - cv / 2)));

  // 4. Normalize with sigmoid for smoother scoring
  const scoreV = sigmoidScore(velocity, benchmarks.velocity);
  const scoreE = sigmoidScore(efficiency, benchmarks.efficiency);
  const scoreC = sigmoidScore(conversion, benchmarks.conversion);

  // Weighted Sum (velocity 35%, efficiency 30%, conversion 20%, consistency 15%)
  const finalScore = (scoreV * 0.35) + (scoreE * 0.30) + (scoreC * 0.20) + (consistencyScore * 0.15);

  // 5. Explain
  const explain = {
    velocity: `${velocity.toFixed(1)} views/day (Score: ${scoreV.toFixed(0)}, Benchmark: ${benchmarks.velocity.toFixed(0)})`,
    efficiency: `${efficiency.toFixed(1)} min avg (Score: ${scoreE.toFixed(0)}, Benchmark: ${benchmarks.efficiency.toFixed(1)})`,
    conversion: `${conversion.toFixed(1)} eng/1k (Score: ${scoreC.toFixed(0)}, Benchmark: ${benchmarks.conversion.toFixed(0)})`,
    consistency: `CV: ${cv.toFixed(2)} (Score: ${consistencyScore.toFixed(0)})`,
    benchmarkSource: channelStats.length >= 5 ? 'dynamic (channel p75)' : 'default',
    verdict: finalScore > 70 ? 'High Quality' : finalScore > 40 ? 'Average' : 'Needs Improvement',
  };

  // 6. Save
  repo.upsertQualityScore({
    video_id: videoId,
    score: finalScore,
    velocity_score: scoreV,
    efficiency_score: scoreE,
    conversion_score: scoreC,
    explain_json: JSON.stringify(explain),
  });
};
