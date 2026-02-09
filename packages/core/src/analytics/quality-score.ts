import { repo } from '../db/repo';

export const calculateQualityScore = (videoId: string) => {
  // 1. Fetch Data
  // Get last 28 days stats for this video
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 28);
  
  const stats = repo.getVideoStats(videoId, start.toISOString().split('T')[0], end.toISOString().split('T')[0]);
  if (stats.length === 0) return;

  // 2. Calculate Components
  const totalViews = stats.reduce((a, b: any) => a + b.views, 0);
  const totalWatchTime = stats.reduce((a, b: any) => a + (b.watch_time_minutes || 0), 0);
  const totalSubs = stats.reduce((a, b: any) => a + (b.subs_gained || 0), 0); // Assuming we had this in video facts, if not use 0
  // Note: fact_video_day schema in migration 2 has likes/comments, not subs. 
  // We will use likes/comments as proxy for conversion if subs not available per video.
  const totalEngagement = stats.reduce((a, b: any) => a + (b.likes || 0) + (b.comments || 0), 0);

  const days = stats.length;
  
  // A. Velocity (Views per Day)
  const velocity = totalViews / days;
  
  // B. Efficiency (Avg View Duration in Minutes)
  const efficiency = totalViews > 0 ? totalWatchTime / totalViews : 0;

  // C. Conversion (Engagement per 1000 views)
  const conversion = totalViews > 0 ? (totalEngagement / totalViews) * 1000 : 0;

  // 3. Normalize (Simple Min-Max or Sigmoid against benchmarks)
  // Benchmarks (Hardcoded for V1, ideally dynamic)
  const benchmarkVelocity = 100; // 100 views/day
  const benchmarkEfficiency = 3; // 3 mins
  const benchmarkConversion = 50; // 50 interactions/1k views

  const scoreV = Math.min(100, (velocity / benchmarkVelocity) * 100);
  const scoreE = Math.min(100, (efficiency / benchmarkEfficiency) * 100);
  const scoreC = Math.min(100, (conversion / benchmarkConversion) * 100);

  // Weighted Sum
  const finalScore = (scoreV * 0.4) + (scoreE * 0.4) + (scoreC * 0.2);

  // 4. Explain
  const explain = {
    velocity: `${velocity.toFixed(1)} views/day (Score: ${scoreV.toFixed(0)})`,
    efficiency: `${efficiency.toFixed(1)} min avg (Score: ${scoreE.toFixed(0)})`,
    conversion: `${conversion.toFixed(1)} eng/1k (Score: ${scoreC.toFixed(0)})`,
    verdict: finalScore > 70 ? 'High Quality' : finalScore > 40 ? 'Average' : 'Needs Improvement'
  };

  // 5. Save
  repo.upsertQualityScore({
    video_id: videoId,
    score: finalScore,
    velocity_score: scoreV,
    efficiency_score: scoreE,
    conversion_score: scoreC,
    explain_json: JSON.stringify(explain)
  });
};
