const { initDb, closeDb, SyncOrchestrator, repo } = require('../dist/index.js');
const { initApi, getApi } = require('../../api/dist/index.js');
const path = require('path');
const fs = require('fs');
const os = require('os');

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const RESET = '\x1b[0m';

console.log('Running Sync Integration Test...');

const tmpDir = os.tmpdir();
const dbPath = path.join(tmpDir, `test-sync-${Date.now()}.sqlite`);
const fixturesDir = path.join(__dirname, '../../api/fixtures'); // Assuming fixtures exist

try {
  // 1. Init DB
  initDb({ path: dbPath });
  
  // 2. Init API (Fake Mode)
  initApi({
    paths: { fixtures: fixturesDir, cache: tmpDir },
    providerMode: 'fake',
    recordFixtures: false,
    getAccessToken: async () => 'fake'
  });

  // 3. Run Sync
  const orchestrator = new SyncOrchestrator(getApi(), (p) => {
    console.log(`[Sync] ${p.stage}: ${p.progress}% - ${p.message}`);
  });

  const range = {
    dateFrom: new Date('2023-01-01'),
    dateTo: new Date('2023-01-07'),
    preset: 'custom'
  };

  // We need to await the sync
  // Note: SyncOrchestrator.run is async
  orchestrator.run(range).then(() => {
    console.log(`${GREEN}✓ Sync Completed${RESET}`);

    // 4. Verify Data in DB
    const db = require('better-sqlite3')(dbPath);
    const channels = db.prepare('SELECT * FROM dim_channel').all();
    const videos = db.prepare('SELECT * FROM dim_video').all();
    const facts = db.prepare('SELECT * FROM fact_channel_day').all();

    console.log(`Channels: ${channels.length}, Videos: ${videos.length}, Facts: ${facts.length}`);

    if (channels.length === 0) throw new Error('No channels synced');
    if (facts.length === 0) throw new Error('No facts synced');

    console.log(`${GREEN}✓ Data Verification Passed${RESET}`);
    closeDb();
    process.exit(0);
  }).catch(e => {
    console.error(e);
    process.exit(1);
  });

} catch (error) {
  console.error(`${RED}Test Failed:${RESET}`, error);
  process.exit(1);
}
