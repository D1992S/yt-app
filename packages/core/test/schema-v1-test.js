const { initDb, closeDb, repo } = require('../dist/index.js');
const path = require('path');
const fs = require('fs');
const os = require('os');

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const RESET = '\x1b[0m';

console.log('Running Schema V1 Test...');

const tmpDir = os.tmpdir();
const dbPath = path.join(tmpDir, `test-schema-${Date.now()}.sqlite`);

try {
  initDb({ path: dbPath });
  console.log(`${GREEN}✓ DB Initialized${RESET}`);

  // 1. Upsert Dimensions
  repo.upsertChannel({
    channel_id: 'UC123',
    title: 'Test Channel',
    created_at: '2020-01-01'
  });
  
  repo.upsertVideo({
    video_id: 'V1',
    channel_id: 'UC123',
    title: 'Video 1',
    published_at: '2023-01-01',
    duration_sec: 600
  });
  console.log(`${GREEN}✓ Dimensions Upserted${RESET}`);

  // 2. Upsert Facts
  repo.upsertChannelDay({
    channel_id: 'UC123',
    day: '2023-01-01',
    views: 100,
    watch_time_minutes: 10,
    avg_view_duration_sec: 30,
    impressions: 1000,
    ctr: 0.1,
    subs_gained: 5,
    subs_lost: 1
  });

  repo.upsertVideoDay({
    video_id: 'V1',
    day: '2023-01-01',
    views: 50,
    watch_time_minutes: 5,
    avg_view_duration_sec: 30,
    impressions: 500,
    ctr: 0.1,
    likes: 10,
    comments: 2
  });
  console.log(`${GREEN}✓ Facts Upserted${RESET}`);

  // 3. Query
  const stats = repo.getChannelStats('UC123', '2023-01-01', '2023-01-31');
  if (stats.length !== 1 || stats[0].views !== 100) {
    throw new Error('Query failed or returned wrong data');
  }
  console.log(`${GREEN}✓ Query Successful${RESET}`);

  closeDb();

} catch (error) {
  console.error(`${RED}Test Failed:${RESET}`, error);
  process.exit(1);
} finally {
  if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
  if (fs.existsSync(dbPath + '-wal')) fs.unlinkSync(dbPath + '-wal');
  if (fs.existsSync(dbPath + '-shm')) fs.unlinkSync(dbPath + '-shm');
}
