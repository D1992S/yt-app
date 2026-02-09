import { repo } from '../db/repo';
import { calculateSimilarity } from '@insight/ml';

export const scoreIdea = (idea: { title: string; effort: number; clusterId?: number }) => {
  // 1. Market Momentum (from Competitors or Topic Pressure)
  // Simplified: Random momentum for V1 or fetch from topic_pressure_day if clusterId exists
  let momentum = 50; // Default neutral
  if (idea.clusterId) {
    // In real app: fetch avg momentum for cluster
    momentum = 70; // Mock high momentum for clustered ideas
  }

  // 2. Effort Penalty
  const effortScore = (10 - idea.effort) * 10; // Lower effort = higher score

  // 3. Total Score
  const score = (momentum * 0.6) + (effortScore * 0.4);

  return {
    score,
    explanation: {
      momentum: `${momentum} (Market Interest)`,
      effort: `${effortScore} (Efficiency)`,
      verdict: score > 70 ? 'High Potential' : 'Medium Potential'
    }
  };
};

export const checkRepetitionRisk = (title: string) => {
  // Check against last 30 videos
  const videos = repo.getAllVideoTitles() as any[]; // Returns user + competitor, filter for user in real app
  // Assuming dim_video is user videos
  const userVideos = videos.filter(v => v.type === 'user').slice(0, 30);

  let maxSim = 0;
  let conflictTitle = '';

  for (const v of userVideos) {
    const sim = calculateSimilarity(title, v.title);
    if (sim > maxSim) {
      maxSim = sim;
      conflictTitle = v.title;
    }
  }

  return {
    riskScore: maxSim * 100,
    riskReason: maxSim > 0.3 ? `Similar to "${conflictTitle}"` : 'Low risk'
  };
};
