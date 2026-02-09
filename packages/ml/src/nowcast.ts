import { quantile, median } from './metrics';

export interface GrowthCurvePoint {
  day: number;
  medianPct: number;
  p25Pct: number;
  p75Pct: number;
}

export const fitGrowthCurves = (
  videos: { id: string; durationSec: number; dailyViews: number[] }[]
): GrowthCurvePoint[] => {
  // 1. Normalize Data
  // We need cumulative views for each video up to Day 28
  const normalizedCurves: number[][] = [];

  for (const v of videos) {
    if (v.dailyViews.length < 28) continue; // Need full history for training

    const cumulative: number[] = [];
    let sum = 0;
    for (const views of v.dailyViews) {
      sum += views;
      cumulative.push(sum);
    }

    const totalDay28 = cumulative[27]; // Day 28 (index 27)
    if (totalDay28 === 0) continue;

    // Normalize to percentage of Day 28 total
    const curve = cumulative.slice(0, 28).map(val => val / totalDay28);
    normalizedCurves.push(curve);
  }

  if (normalizedCurves.length === 0) return [];

  // 2. Calculate Statistics per Day
  const result: GrowthCurvePoint[] = [];
  for (let day = 0; day < 28; day++) {
    const valuesAtDay = normalizedCurves.map(c => c[day]);
    result.push({
      day: day + 1,
      medianPct: median(valuesAtDay),
      p25Pct: quantile(valuesAtDay, 0.25),
      p75Pct: quantile(valuesAtDay, 0.75)
    });
  }

  return result;
};

export const predictFromCurve = (
  currentCumulativeViews: number,
  daysSincePublish: number,
  curve: GrowthCurvePoint[]
) => {
  // Find the curve point for current day
  const point = curve.find(p => p.day === daysSincePublish);
  
  // If video is older than curve or day 0, fallback
  if (!point || point.medianPct === 0) {
    return { predicted7d: currentCumulativeViews, range: [currentCumulativeViews, currentCumulativeViews] };
  }

  // Multiplier to project to Day 7 (if current < 7) or Day 28
  // Let's project to Day 7 cumulative
  const targetDay = 7;
  const targetPoint = curve.find(p => p.day === targetDay);
  
  if (!targetPoint) return { predicted7d: currentCumulativeViews, range: [currentCumulativeViews, currentCumulativeViews] };

  if (daysSincePublish >= targetDay) {
    return { predicted7d: currentCumulativeViews, range: [currentCumulativeViews, currentCumulativeViews] };
  }

  // Projection: Current / CurrentPct * TargetPct
  const predictedMedian = (currentCumulativeViews / point.medianPct) * targetPoint.medianPct;
  const predictedP25 = (currentCumulativeViews / point.p75Pct) * targetPoint.p25Pct; // Conservative
  const predictedP75 = (currentCumulativeViews / point.p25Pct) * targetPoint.p75Pct; // Optimistic

  return {
    predicted7d: Math.round(predictedMedian),
    range: [Math.round(predictedP25), Math.round(predictedP75)]
  };
};
