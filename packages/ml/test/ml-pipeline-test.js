const { buildTrainingSet, TextClusterer, SeededRNG } = require('../dist/index.js');

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const RESET = '\x1b[0m';

console.log('Running ML Pipeline Tests...');

try {
  // --- 1. Leakage Check ---
  console.log('1. Testing Data Leakage...');
  const now = new Date().getTime();
  const dayMs = 24 * 60 * 60 * 1000;
  
  const videos = [
    {
      id: 'v_mature',
      publishedAt: new Date(now - 10 * dayMs).toISOString(), // 10 days ago
      durationSec: 600,
      title: 'Mature Video',
      channelAvgViewsLast28d: 1000,
      channelSubscribersAtPublish: 500,
      views7d: 2000,
      watchTime7d: 10000
    },
    {
      id: 'v_immature',
      publishedAt: new Date(now - 2 * dayMs).toISOString(), // 2 days ago
      durationSec: 300,
      title: 'Immature Video',
      channelAvgViewsLast28d: 1000,
      channelSubscribersAtPublish: 500,
      views7d: 500, // Should be ignored
      watchTime7d: 2000
    }
  ];

  const trainingSet = buildTrainingSet(videos, 'views_7d');
  
  if (trainingSet.find(x => x.meta.id === 'v_immature')) {
    throw new Error('Leakage detected! Immature video included in training set.');
  }
  if (!trainingSet.find(x => x.meta.id === 'v_mature')) {
    throw new Error('Valid video excluded from training set.');
  }
  console.log(`${GREEN}✓ Leakage Check Passed${RESET}`);

  // --- 2. Determinism Check ---
  console.log('2. Testing Determinism (Clustering)...');
  const docs = [
    { id: '1', text: 'apple banana' },
    { id: '2', text: 'apple orange' },
    { id: '3', text: 'car bus' },
    { id: '4', text: 'car truck' }
  ];

  const clusterer1 = new TextClusterer(42); // Seed 42
  const vectors1 = clusterer1.fitTransform(docs);
  const result1 = clusterer1.kMeans(vectors1, 2);

  const clusterer2 = new TextClusterer(42); // Same Seed
  const vectors2 = clusterer2.fitTransform(docs);
  const result2 = clusterer2.kMeans(vectors2, 2);

  // Check if assignments are identical
  const json1 = JSON.stringify(result1);
  const json2 = JSON.stringify(result2);

  if (json1 !== json2) {
    throw new Error('Clustering is not deterministic with same seed!');
  }
  console.log(`${GREEN}✓ Determinism Check Passed${RESET}`);

  // --- 3. RNG Check ---
  console.log('3. Testing Seeded RNG...');
  const rng1 = new SeededRNG(123);
  const val1 = rng1.next();
  const rng2 = new SeededRNG(123);
  const val2 = rng2.next();
  
  if (val1 !== val2) throw new Error('RNG not deterministic');
  console.log(`${GREEN}✓ RNG Check Passed${RESET}`);

  console.log(`${GREEN}All ML Pipeline Tests Passed${RESET}`);
  process.exit(0);

} catch (e) {
  console.error(`${RED}ML Pipeline Test Failed:${RESET}`, e);
  process.exit(1);
}
