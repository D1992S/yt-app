import { describe, it, expect } from 'vitest';
import { buildTrainingSet, buildPredictionFeatures, VideoInput } from '../feature-store';

/** Helper: create a VideoInput with sensible defaults. */
function makeVideo(overrides: Partial<VideoInput> & { id: string }): VideoInput {
  return {
    publishedAt: '2023-01-01T12:00:00Z',
    durationSec: 600,
    title: 'Test Video Title',
    channelAvgViewsLast28d: 1000,
    channelSubscribersAtPublish: 10000,
    views7d: 5000,
    watchTime7d: 25000,
    ...overrides,
  };
}

// The actual feature vector has 11 features:
// [duration, titleLen, momentum, hourSin, hourCos, dowSin, dowCos, wordCount, hasQuestion, hasNumber, durationBucket]
const FEATURE_COUNT = 11;

describe('buildTrainingSet', () => {
  it('leakage guard: skips videos published less than 7 days ago', () => {
    const recentVideo = makeVideo({
      id: 'recent',
      publishedAt: new Date().toISOString(),
      views7d: 100,
    });

    const result = buildTrainingSet([recentVideo], 'views_7d');
    expect(result).toHaveLength(0);
  });

  it('includes videos published more than 7 days ago', () => {
    const oldDate = new Date();
    oldDate.setDate(oldDate.getDate() - 30);

    const oldVideo = makeVideo({
      id: 'old',
      publishedAt: oldDate.toISOString(),
      views7d: 5000,
    });

    const result = buildTrainingSet([oldVideo], 'views_7d');
    expect(result).toHaveLength(1);
    expect(result[0].meta.id).toBe('old');
  });

  it('skips videos with missing labels (undefined views7d)', () => {
    const oldDate = new Date();
    oldDate.setDate(oldDate.getDate() - 30);

    const video = makeVideo({
      id: 'no-label',
      publishedAt: oldDate.toISOString(),
      views7d: undefined,
    });

    const result = buildTrainingSet([video], 'views_7d');
    expect(result).toHaveLength(0);
  });

  it('skips videos with NaN labels', () => {
    const oldDate = new Date();
    oldDate.setDate(oldDate.getDate() - 30);

    const video = makeVideo({
      id: 'nan-label',
      publishedAt: oldDate.toISOString(),
      views7d: NaN,
    });

    const result = buildTrainingSet([video], 'views_7d');
    expect(result).toHaveLength(0);
  });

  it('produces the correct number of features (11)', () => {
    const oldDate = new Date();
    oldDate.setDate(oldDate.getDate() - 30);

    const video = makeVideo({
      id: 'features',
      publishedAt: oldDate.toISOString(),
    });

    const result = buildTrainingSet([video], 'views_7d');
    expect(result).toHaveLength(1);
    expect(result[0].features).toHaveLength(FEATURE_COUNT);
  });

  it('computes features correctly', () => {
    // Use a fixed date far in the past
    const oldDate = new Date('2023-06-15T14:00:00Z');

    const video = makeVideo({
      id: 'feat-check',
      publishedAt: oldDate.toISOString(),
      durationSec: 300, // 5 minutes
      title: 'Hello World', // 11 characters, 2 words, no question mark, no number
      channelAvgViewsLast28d: 500,
      channelSubscribersAtPublish: 10000,
      views7d: 2000,
    });

    const result = buildTrainingSet([video], 'views_7d');
    expect(result).toHaveLength(1);

    const f = result[0].features;
    // [0] duration in minutes
    expect(f[0]).toBeCloseTo(5, 5); // 300/60
    // [1] title length
    expect(f[1]).toBe(11);
    // [2] momentum
    expect(f[2]).toBeCloseTo(0.05, 5); // 500/10000
    // [3] hourSin = sin(2*PI*14/24)
    const expectedHourSin = Math.sin((2 * Math.PI * 14) / 24);
    expect(f[3]).toBeCloseTo(expectedHourSin, 5);
    // [4] hourCos = cos(2*PI*14/24)
    const expectedHourCos = Math.cos((2 * Math.PI * 14) / 24);
    expect(f[4]).toBeCloseTo(expectedHourCos, 5);
    // [5] dowSin -- June 15 2023 is a Thursday (day 4)
    const expectedDowSin = Math.sin((2 * Math.PI * 4) / 7);
    expect(f[5]).toBeCloseTo(expectedDowSin, 5);
    // [6] dowCos
    const expectedDowCos = Math.cos((2 * Math.PI * 4) / 7);
    expect(f[6]).toBeCloseTo(expectedDowCos, 5);
    // [7] word count: "Hello World" => 2 words
    expect(f[7]).toBe(2);
    // [8] has question mark => 0
    expect(f[8]).toBe(0);
    // [9] has number => 0
    expect(f[9]).toBe(0);
    // [10] duration bucket: 5 min => medium (5-15) => 1
    expect(f[10]).toBe(1);
  });

  it('uses views7d as label for views_7d target', () => {
    const oldDate = new Date();
    oldDate.setDate(oldDate.getDate() - 30);

    const video = makeVideo({
      id: 'label-views',
      publishedAt: oldDate.toISOString(),
      views7d: 1234,
      watchTime7d: 5678,
    });

    const result = buildTrainingSet([video], 'views_7d');
    expect(result[0].label).toBe(1234);
  });

  it('uses watchTime7d as label for watchtime_7d target', () => {
    const oldDate = new Date();
    oldDate.setDate(oldDate.getDate() - 30);

    const video = makeVideo({
      id: 'label-wt',
      publishedAt: oldDate.toISOString(),
      views7d: 1234,
      watchTime7d: 5678,
    });

    const result = buildTrainingSet([video], 'watchtime_7d');
    expect(result[0].label).toBe(5678);
  });

  it('sets momentum to 0 when subscribers are 0', () => {
    const oldDate = new Date();
    oldDate.setDate(oldDate.getDate() - 30);

    const video = makeVideo({
      id: 'zero-subs',
      publishedAt: oldDate.toISOString(),
      channelSubscribersAtPublish: 0,
      channelAvgViewsLast28d: 1000,
    });

    const result = buildTrainingSet([video], 'views_7d');
    // features[2] is momentum
    expect(result[0].features[2]).toBe(0);
  });

  it('filters a mix of valid and invalid videos correctly', () => {
    const validDate = new Date();
    validDate.setDate(validDate.getDate() - 30);

    const videos = [
      makeVideo({ id: 'valid1', publishedAt: validDate.toISOString(), views7d: 100 }),
      makeVideo({ id: 'recent', publishedAt: new Date().toISOString(), views7d: 200 }),
      makeVideo({ id: 'no-label', publishedAt: validDate.toISOString(), views7d: undefined }),
      makeVideo({ id: 'valid2', publishedAt: validDate.toISOString(), views7d: 300 }),
    ];

    const result = buildTrainingSet(videos, 'views_7d');
    expect(result).toHaveLength(2);
    expect(result.map(r => r.meta.id)).toEqual(['valid1', 'valid2']);
  });

  it('includes correct metadata', () => {
    const oldDate = new Date();
    oldDate.setDate(oldDate.getDate() - 30);
    const pubString = oldDate.toISOString();

    const video = makeVideo({
      id: 'meta-check',
      publishedAt: pubString,
    });

    const result = buildTrainingSet([video], 'views_7d');
    expect(result[0].meta.id).toBe('meta-check');
    expect(result[0].meta.date).toBe(pubString);
  });

  it('detects question marks in titles', () => {
    const oldDate = new Date();
    oldDate.setDate(oldDate.getDate() - 30);

    const video = makeVideo({
      id: 'question',
      publishedAt: oldDate.toISOString(),
      title: 'Is This The Best Video?',
    });

    const result = buildTrainingSet([video], 'views_7d');
    // features[8] = hasQuestion
    expect(result[0].features[8]).toBe(1);
  });

  it('detects numbers in titles', () => {
    const oldDate = new Date();
    oldDate.setDate(oldDate.getDate() - 30);

    const video = makeVideo({
      id: 'number',
      publishedAt: oldDate.toISOString(),
      title: 'Top 10 Tips for Success',
    });

    const result = buildTrainingSet([video], 'views_7d');
    // features[9] = hasNumber
    expect(result[0].features[9]).toBe(1);
  });

  it('assigns correct duration bucket for short videos (<5min)', () => {
    const oldDate = new Date();
    oldDate.setDate(oldDate.getDate() - 30);

    const video = makeVideo({
      id: 'short',
      publishedAt: oldDate.toISOString(),
      durationSec: 180, // 3 minutes
    });

    const result = buildTrainingSet([video], 'views_7d');
    // features[10] = durationBucket, <5min => 0
    expect(result[0].features[10]).toBe(0);
  });

  it('assigns correct duration bucket for long videos (>15min)', () => {
    const oldDate = new Date();
    oldDate.setDate(oldDate.getDate() - 30);

    const video = makeVideo({
      id: 'long',
      publishedAt: oldDate.toISOString(),
      durationSec: 1200, // 20 minutes
    });

    const result = buildTrainingSet([video], 'views_7d');
    // features[10] = durationBucket, >15min => 2
    expect(result[0].features[10]).toBe(2);
  });
});

describe('buildPredictionFeatures', () => {
  it('returns features in the correct order with 11 elements', () => {
    const input = makeVideo({
      id: 'predict',
      publishedAt: '2024-03-15T10:00:00Z',
      durationSec: 720, // 12 minutes
      title: 'My Amazing Video', // 16 chars, 3 words, no question, no number
      channelAvgViewsLast28d: 2000,
      channelSubscribersAtPublish: 50000,
    });

    const features = buildPredictionFeatures(input);

    expect(features).toHaveLength(FEATURE_COUNT);
    // [0] duration
    expect(features[0]).toBeCloseTo(12, 5); // 720/60
    // [1] title length
    expect(features[1]).toBe(16);
    // [2] momentum
    expect(features[2]).toBeCloseTo(0.04, 5); // 2000/50000
    // [3] hourSin for hour=10
    expect(features[3]).toBeCloseTo(Math.sin((2 * Math.PI * 10) / 24), 5);
    // [4] hourCos for hour=10
    expect(features[4]).toBeCloseTo(Math.cos((2 * Math.PI * 10) / 24), 5);
  });

  it('matches the feature order of buildTrainingSet', () => {
    const oldDate = new Date();
    oldDate.setDate(oldDate.getDate() - 30);

    const video = makeVideo({
      id: 'match',
      publishedAt: oldDate.toISOString(),
      durationSec: 180,
      title: 'Test Title',
      channelAvgViewsLast28d: 300,
      channelSubscribersAtPublish: 1000,
      views7d: 999,
    });

    const trainResult = buildTrainingSet([video], 'views_7d');
    const predFeatures = buildPredictionFeatures(video);

    expect(predFeatures).toEqual(trainResult[0].features);
  });

  it('handles zero subscribers', () => {
    const input = makeVideo({
      id: 'zero',
      channelSubscribersAtPublish: 0,
      channelAvgViewsLast28d: 500,
    });

    const features = buildPredictionFeatures(input);
    expect(features[2]).toBe(0); // momentum = 0 when no subscribers
  });

  it('encodes hour cyclically (sin and cos)', () => {
    const input = makeVideo({
      id: 'hour-test',
      publishedAt: '2024-07-20T23:30:00Z',
    });

    const features = buildPredictionFeatures(input);
    // Hour = 23 (getHours from UTC)
    const expectedSin = Math.sin((2 * Math.PI * 23) / 24);
    const expectedCos = Math.cos((2 * Math.PI * 23) / 24);
    expect(features[3]).toBeCloseTo(expectedSin, 5);
    expect(features[4]).toBeCloseTo(expectedCos, 5);
  });

  it('correctly counts words in title', () => {
    const input = makeVideo({
      id: 'words',
      title: 'One Two Three Four Five',
    });

    const features = buildPredictionFeatures(input);
    // features[7] = wordCount
    expect(features[7]).toBe(5);
  });
});
