export interface VideoInput {
  id: string;
  publishedAt: string;
  durationSec: number;
  title: string;
  // Historical context available AT publish time
  channelAvgViewsLast28d: number;
  channelSubscribersAtPublish: number;
  // Target (future data)
  views7d?: number;
  watchTime7d?: number;
}

export interface TrainingExample {
  features: number[];
  label: number;
  meta: { id: string; date: string };
}

export const buildTrainingSet = (
  videos: VideoInput[], 
  target: 'views_7d' | 'watchtime_7d'
): TrainingExample[] => {
  const dataset: TrainingExample[] = [];
  const now = new Date().getTime();

  for (const v of videos) {
    const pubDate = new Date(v.publishedAt).getTime();
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

    // Leakage Guard: Ensure we have 7 days of data maturity
    if (now < pubDate + sevenDaysMs) {
      continue; 
    }

    const label = target === 'views_7d' ? v.views7d : v.watchTime7d;
    
    // Skip if label is missing or invalid
    if (label === undefined || label === null || isNaN(label)) {
      continue;
    }

    // Feature Engineering
    // 1. Duration (normalized roughly to minutes)
    const featDuration = v.durationSec / 60;
    
    // 2. Title Length
    const featTitleLen = v.title.length;
    
    // 3. Channel Momentum (normalized)
    const featMomentum = v.channelSubscribersAtPublish > 0 
      ? v.channelAvgViewsLast28d / v.channelSubscribersAtPublish 
      : 0;

    // 4. Publish Hour (Cyclical encoding could be better, using raw for V1)
    const featHour = new Date(v.publishedAt).getHours();

    dataset.push({
      features: [featDuration, featTitleLen, featMomentum, featHour],
      label: label,
      meta: { id: v.id, date: v.publishedAt }
    });
  }

  return dataset;
};

export const buildPredictionFeatures = (input: VideoInput): number[] => {
  // Must match buildTrainingSet logic exactly
  const featDuration = input.durationSec / 60;
  const featTitleLen = input.title.length;
  const featMomentum = input.channelSubscribersAtPublish > 0 
      ? input.channelAvgViewsLast28d / input.channelSubscribersAtPublish 
      : 0;
  const featHour = new Date(input.publishedAt).getHours();

  return [featDuration, featTitleLen, featMomentum, featHour];
};
