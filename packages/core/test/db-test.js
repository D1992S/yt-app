const { initDb, closeDb, meta } = require('../dist/index.js'); // Assumes built output
const path = require('path');
const fs = require('fs');
const os = require('os');

// Note: This test requires the package to be built first (tsc)
// Usage: node packages/core/test/db-test.js

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const RESET = '\x1b[0m';

console.log('Running DB Integration Test...');

const tmpDir = os.tmpdir();
const dbPath = path.join(tmpDir, `test-db-${Date.now()}.sqlite`);

try {
  // 1. Initialize
  console.log(`Creating temp DB at: ${dbPath}`);
  const db = initDb({ path: dbPath, verbose: false });
  
  // 2. Verify Migrations
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
  const tableNames = tables.map(t => t.name);
  
  if (!tableNames.includes('migrations') || !tableNames.includes('app_meta')) {
    throw new Error('Tables missing after initialization');
  }
  console.log(`${GREEN}✓ Schema created${RESET}`);

  // 3. Test Meta Operations
  const testKey = 'test_run_id';
  const testValue = 'run_123';
  
  meta.set(testKey, testValue);
  const retrieved = meta.get(testKey);
  
  if (retrieved !== testValue) {
    throw new Error(`Meta mismatch. Expected ${testValue}, got ${retrieved}`);
  }
  console.log(`${GREEN}✓ Meta Read/Write passed${RESET}`);

  // 4. Test Update
  meta.set(testKey, 'run_456');
  const updated = meta.get(testKey);
  if (updated !== 'run_456') {
    throw new Error('Meta update failed');
  }
  console.log(`${GREEN}✓ Meta Update passed${RESET}`);

  closeDb();
  console.log(`${GREEN}✓ DB Closed${RESET}`);

} catch (error) {
  console.error(`${RED}Test Failed:${RESET}`, error);
  process.exit(1);
} finally {
  // Cleanup
  if (fs.existsSync(dbPath)) {
    fs.unlinkSync(dbPath);
    console.log('Temp DB deleted');
  }
  if (fs.existsSync(dbPath + '-wal')) fs.unlinkSync(dbPath + '-wal');
  if (fs.existsSync(dbPath + '-shm')) fs.unlinkSync(dbPath + '-shm');
}
