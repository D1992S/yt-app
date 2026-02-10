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
    const features = extractFeatures(v);

    dataset.push({
      features,
      label: label,
      meta: { id: v.id, date: v.publishedAt }
    });
  }

  return dataset;
};

export const buildPredictionFeatures = (input: VideoInput): number[] => {
  // Must match buildTrainingSet logic exactly
  return extractFeatures(input);
};

// ---------- Shared feature extraction ----------

function extractFeatures(v: VideoInput): number[] {
  // 1. Duration (normalized roughly to minutes)
  const featDuration = v.durationSec / 60;

  // 2. Title Length
  const featTitleLen = v.title.length;

  // 3. Channel Momentum (normalized)
  const featMomentum = v.channelSubscribersAtPublish > 0
    ? v.channelAvgViewsLast28d / v.channelSubscribersAtPublish
    : 0;

  // 4. Cyclical hour encoding (replaces raw hour)
  const hour = new Date(v.publishedAt).getHours();
  const featHourSin = Math.sin((2 * Math.PI * hour) / 24);
  const featHourCos = Math.cos((2 * Math.PI * hour) / 24);

  // 5. Cyclical day-of-week encoding
  const dow = new Date(v.publishedAt).getDay();
  const featDowSin = Math.sin((2 * Math.PI * dow) / 7);
  const featDowCos = Math.cos((2 * Math.PI * dow) / 7);

  // 6. Title word count
  const featWordCount = v.title.trim().split(/\s+/).filter(w => w.length > 0).length;

  // 7. Has question mark
  const featHasQuestion = v.title.includes('?') ? 1 : 0;

  // 8. Has number
  const featHasNumber = /\d/.test(v.title) ? 1 : 0;

  // 9. Duration bucket: short (<5min)=0, medium (5-15min)=1, long (>15min)=2
  const durationMin = v.durationSec / 60;
  const featDurationBucket = durationMin < 5 ? 0 : durationMin <= 15 ? 1 : 2;

  return [
    featDuration,
    featTitleLen,
    featMomentum,
    featHourSin,
    featHourCos,
    featDowSin,
    featDowCos,
    featWordCount,
    featHasQuestion,
    featHasNumber,
    featDurationBucket,
  ];
}
