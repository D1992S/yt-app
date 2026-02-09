import { repo } from '../db/repo';

export const calculateMomentum = (videoId: string, currentDay: string) => {
  const snapshots = repo.getCompetitorVideoSnapshots(videoId) as any[];
  if (snapshots.length < 2) return;

  // Sort by day just in case
  snapshots.sort((a, b) => a.day.localeCompare(b.day));

  const currentSnapshot = snapshots.find(s => s.day === currentDay);
  if (!currentSnapshot) return;

  const currentIndex = snapshots.indexOf(currentSnapshot);
  if (currentIndex === 0) return; // No previous day

  const prevSnapshot = snapshots[currentIndex - 1];
  
  // Calculate 24h Velocity
  const velocity24h = Math.max(0, currentSnapshot.view_count - prevSnapshot.view_count);

  // Calculate 7d Velocity
  let velocity7d = 0;
  if (currentIndex >= 7) {
    const prev7Snapshot = snapshots[currentIndex - 7];
    velocity7d = Math.max(0, currentSnapshot.view_count - prev7Snapshot.view_count);
  } else {
    // Fallback if less than 7 days, use total since start
    velocity7d = Math.max(0, currentSnapshot.view_count - snapshots[0].view_count);
  }

  // Hit Detection Logic
  // Simple heuristic: Is this velocity in the top 5% of velocities seen for this video so far?
  // In a real system, we'd compare against the channel's average velocity.
  // For V1, we use a simple threshold based on the video's own history.
  
  const velocities = [];
  for (let i = 1; i < snapshots.length; i++) {
    velocities.push(Math.max(0, snapshots[i].view_count - snapshots[i-1].view_count));
  }
  
  velocities.sort((a, b) => a - b);
  const percentile95Index = Math.floor(velocities.length * 0.95);
  const threshold = velocities[percentile95Index] || 0;

  // Momentum Score: Velocity / Average Velocity (normalized)
  const avgVelocity = velocities.reduce((a, b) => a + b, 0) / velocities.length;
  const momentumScore = avgVelocity > 0 ? velocity24h / avgVelocity : 0;

  const isHit = (velocity24h > threshold && velocity24h > 1000) ? 1 : 0; // Min 1000 views to be a hit

  repo.upsertMomentum({
    video_id: videoId,
    day: currentDay,
    velocity_24h: velocity24h,
    velocity_7d: velocity7d,
    momentum_score: momentumScore,
    is_hit: isHit
  });
};
