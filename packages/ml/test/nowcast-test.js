const { fitGrowthCurves, predictFromCurve } = require('../dist/index.js');

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const RESET = '\x1b[0m';

console.log('Running Nowcast Tests...');

try {
  // 1. Test Curve Fitting
  // Create 3 videos with linear growth: 100, 200, 300...
  const videos = [
    { id: 'v1', durationSec: 300, dailyViews: Array.from({length: 30}, (_, i) => 100) },
    { id: 'v2', durationSec: 300, dailyViews: Array.from({length: 30}, (_, i) => 100) },
    { id: 'v3', durationSec: 300, dailyViews: Array.from({length: 30}, (_, i) => 100) }
  ];

  const curves = fitGrowthCurves(videos);
  
  if (curves.length !== 28) throw new Error(`Expected 28 curve points, got ${curves.length}`);
  
  // Day 1 cumulative should be 100. Day 28 cumulative should be 2800.
  // Normalized Day 1 should be 100/2800 = 0.0357
  const day1 = curves.find(c => c.day === 1);
  const expectedPct = 100 / 2800;
  
  if (Math.abs(day1.medianPct - expectedPct) > 0.001) {
    throw new Error(`Curve fitting failed. Expected ${expectedPct}, got ${day1.medianPct}`);
  }
  console.log(`${GREEN}✓ Curve Fitting Passed${RESET}`);

  // 2. Test Prediction
  // Video at Day 1 has 50 views. Curve says Day 1 is 3.57% of Day 28.
  // Day 7 is 700/2800 = 25%.
  // Prediction for Day 7: (50 / 0.0357) * 0.25 = 350.
  
  const prediction = predictFromCurve(50, 1, curves);
  
  if (Math.abs(prediction.predicted7d - 350) > 5) {
    throw new Error(`Prediction failed. Expected ~350, got ${prediction.predicted7d}`);
  }
  console.log(`${GREEN}✓ Prediction Logic Passed${RESET}`);

  console.log(`${GREEN}All Nowcast Tests Passed${RESET}`);
  process.exit(0);

} catch (e) {
  console.error(`${RED}Nowcast Test Failed:${RESET}`, e);
  process.exit(1);
}
