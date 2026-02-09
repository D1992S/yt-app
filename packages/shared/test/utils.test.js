const { formatDateISO, addDays, getDaysBetween, sum, mean, percentChange } = require('../dist/index.js');

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const RESET = '\x1b[0m';

console.log('Running Shared Utils Tests...');

try {
  // Date Tests
  const d1 = new Date('2023-01-01T12:00:00Z');
  if (formatDateISO(d1) !== '2023-01-01') throw new Error('formatDateISO failed');
  
  const d2 = addDays(d1, 5);
  if (formatDateISO(d2) !== '2023-01-06') throw new Error('addDays failed');
  
  const diff = getDaysBetween(d1, d2);
  if (diff !== 5) throw new Error(`getDaysBetween failed. Expected 5, got ${diff}`);

  console.log(`${GREEN}✓ Date Utils Passed${RESET}`);

  // Math Tests
  const nums = [10, 20, 30];
  if (sum(nums) !== 60) throw new Error('sum failed');
  if (mean(nums) !== 20) throw new Error('mean failed');
  
  const pct = percentChange(150, 100);
  if (pct !== 50) throw new Error(`percentChange failed. Expected 50, got ${pct}`);

  console.log(`${GREEN}✓ Math Utils Passed${RESET}`);

  process.exit(0);
} catch (e) {
  console.error(`${RED}Utils Test Failed:${RESET}`, e);
  process.exit(1);
}
