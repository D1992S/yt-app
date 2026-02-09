const { buildTrainingSet } = require('../dist/index.js');

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const RESET = '\x1b[0m';

console.log('Running ML Feature Tests...');

try {
  const now = new Date().getTime();
  const dayMs = 24 * 60 * 60 * 1000;

  // Mock Videos
  const videos = [
    {
      id: 'v1',
      publishedAt: new Date(now - 10 * dayMs).toISOString(), // 10 days ago (Mature)
      durationSec: 600,
      title: 'Test Video 1',
      channelAvgViewsLast28d: 1000,
      channelSubscribersAtPublish: 500,
      views7d: 2000,
      watchTime7d: 10000
    },
    {
      id: 'v2',
      publishedAt: new Date(now - 2 * dayMs).toISOString(), // 2 days ago (Immature - Leakage Risk)
      durationSec: 300,
      title: 'Test Video 2',
      channelAvgViewsLast28d: 1000,
      channelSubscribersAtPublish: 500,
      views7d: 500, // Should be ignored
      watchTime7d: 2000
    },
    {
      id: 'v3',
      publishedAt: new Date(now - 20 * dayMs).toISOString(), // 20 days ago (Mature)
      durationSec: 300,
      title: 'Test Video 3',
      channelAvgViewsLast28d: 1000,
      channelSubscribersAtPublish: 500,
      views7d: undefined, // Missing label
      watchTime7d: 2000
    }
  ];

  const trainingSet = buildTrainingSet(videos, 'views_7d');

  // Test 1: Leakage Guard
  if (trainingSet.find(x => x.meta.id === 'v2')) {
    throw new Error('Leakage detected! Immature video included in training set.');
  }
  console.log(`${GREEN}✓ Leakage Guard Passed${RESET}`);

  // Test 2: Missing Label
  if (trainingSet.find(x => x.meta.id === 'v3')) {
    throw new Error('Missing label check failed! Video with undefined label included.');
  }
  console.log(`${GREEN}✓ Missing Label Check Passed${RESET}`);

  // Test 3: Valid Data
  const v1 = trainingSet.find(x => x.meta.id === 'v1');
  if (!v1) throw new Error('Valid video excluded from training set.');
  if (v1.label !== 2000) throw new Error('Label mismatch.');
  if (v1.features.length !== 4) throw new Error('Feature vector dimension mismatch.');
  console.log(`${GREEN}✓ Valid Data Generation Passed${RESET}`);

  console.log(`${GREEN}All ML Tests Passed${RESET}`);
  process.exit(0);

} catch (e) {
  console.error(`${RED}ML Test Failed:${RESET}`, e);
  process.exit(1);
}
