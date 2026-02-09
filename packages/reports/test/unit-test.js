const { detectAnomalies } = require('../dist/index.js');

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const RESET = '\x1b[0m';

console.log('Running Reports Unit Tests...');

try {
  // Test 1: No anomalies in flat data
  const flatData = Array.from({ length: 10 }, (_, i) => ({
    date: `2023-01-${i + 1}`,
    metric: 'views',
    value: 100
  }));
  
  const anomalies1 = detectAnomalies(flatData, 'views');
  if (anomalies1.length !== 0) throw new Error('Found anomalies in flat data');
  console.log(`${GREEN}✓ Flat data test passed${RESET}`);

  // Test 2: Spike detection
  const spikeData = [...flatData];
  spikeData[5] = { ...spikeData[5], value: 500 }; // 5x spike
  
  const anomalies2 = detectAnomalies(spikeData, 'views');
  if (anomalies2.length !== 1) throw new Error(`Expected 1 anomaly, found ${anomalies2.length}`);
  if (anomalies2[0].value !== 500) throw new Error('Wrong anomaly value detected');
  console.log(`${GREEN}✓ Spike detection test passed${RESET}`);

  console.log(`${GREEN}All Unit Tests Passed${RESET}`);
  process.exit(0);
} catch (e) {
  console.error(`${RED}Unit Test Failed:${RESET}`, e);
  process.exit(1);
}
