import { repo } from '../db/repo';

/**
 * Exponential Moving Average for smoothing velocity signals.
 */
const ema = (values: number[], alpha = 0.3): number[] => {
  if (values.length === 0) return [];
  const result = [values[0]];
  for (let i = 1; i < values.length; i++) {
    result.push(alpha * values[i] + (1 - alpha) * result[i - 1]);
  }
  return result;
};

export const calculateMomentum = (videoId: string, currentDay: string) => {
  const snapshots = repo.getCompetitorVideoSnapshots(videoId) as any[];
  if (snapshots.length < 2) return;

  // Sort by day
  snapshots.sort((a, b) => a.day.localeCompare(b.day));

  const currentSnapshot = snapshots.find(s => s.day === currentDay);
  if (!currentSnapshot) return;

  const currentIndex = snapshots.indexOf(currentSnapshot);
  if (currentIndex === 0) return;

  const prevSnapshot = snapshots[currentIndex - 1];

  // Calculate 24h Velocity
  const velocity24h = Math.max(0, currentSnapshot.view_count - prevSnapshot.view_count);

  // Calculate 7d Velocity
  let velocity7d = 0;
  if (currentIndex >= 7) {
    const prev7Snapshot = snapshots[currentIndex - 7];
    velocity7d = Math.max(0, currentSnapshot.view_count - prev7Snapshot.view_count);
  } else {
    velocity7d = Math.max(0, currentSnapshot.view_count - snapshots[0].view_count);
  }

  // Build full velocity history
  const velocities: number[] = [];
  for (let i = 1; i < snapshots.length; i++) {
    velocities.push(Math.max(0, snapshots[i].view_count - snapshots[i - 1].view_count));
  }

  // Hit Detection: 95th percentile threshold
  const sorted = [...velocities].sort((a, b) => a - b);
  const percentile95Index = Math.floor(sorted.length * 0.95);
  const threshold = sorted[percentile95Index] || 0;

  // Momentum Score: Velocity / Average Velocity (normalized)
  const avgVelocity = velocities.reduce((a, b) => a + b, 0) / velocities.length;
  const momentumScore = avgVelocity > 0 ? velocity24h / avgVelocity : 0;

  const isHit = (velocity24h > threshold && velocity24h > 1000) ? 1 : 0;

  // --- V2: Acceleration Detection (second derivative of velocity) ---
  // Acceleration = change in velocity over time
  let acceleration = 0;
  let accelerationTrend: 'accelerating' | 'decelerating' | 'stable' = 'stable';

  if (velocities.length >= 3) {
    // Smooth velocities with EMA to reduce noise
    const smoothed = ema(velocities, 0.3);

    // Current acceleration = smoothed velocity delta over last 3 data points
    const recentSmoothed = smoothed.slice(-3);
    const accel1 = recentSmoothed[1] - recentSmoothed[0]; // first derivative change
    const accel2 = recentSmoothed[2] - recentSmoothed[1]; // second derivative change
    acceleration = accel2 - accel1; // rate of change of velocity change

    // Also compute simple 3-day acceleration (more intuitive)
    const simpleAccel = recentSmoothed[2] - recentSmoothed[0];
    const accelThreshold = avgVelocity * 0.1; // 10% of avg velocity as significance threshold

    if (simpleAccel > accelThreshold) {
      accelerationTrend = 'accelerating';
    } else if (simpleAccel < -accelThreshold) {
      accelerationTrend = 'decelerating';
    }
  }

  // --- V2: Sustained Momentum Detection ---
  // Check if momentum has been above 1.5x average for 3+ consecutive days
  let sustainedDays = 0;
  if (velocities.length >= 3) {
    for (let i = velocities.length - 1; i >= 0; i--) {
      if (avgVelocity > 0 && velocities[i] / avgVelocity > 1.5) {
        sustainedDays++;
      } else {
        break;
      }
    }
  }
  const isSustainedMomentum = sustainedDays >= 3;

  repo.upsertMomentum({
    video_id: videoId,
    day: currentDay,
    velocity_24h: velocity24h,
    velocity_7d: velocity7d,
    momentum_score: momentumScore,
    is_hit: isHit,
    acceleration: Math.round(acceleration * 100) / 100,
    acceleration_trend: accelerationTrend,
    sustained_momentum_days: sustainedDays,
    is_sustained: isSustainedMomentum ? 1 : 0,
  });
};
