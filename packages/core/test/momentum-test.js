const { initDb, closeDb, repo, calculateMomentum } = require('../dist/index.js');
const path = require('path');
const fs = require('fs');
const os = require('os');

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const RESET = '\x1b[0m';

console.log('Running Momentum Logic Test...');

const tmpDir = os.tmpdir();
const dbPath = path.join(tmpDir, `test-momentum-${Date.now()}.sqlite`);

try {
  initDb({ path: dbPath });

  // 1. Setup Competitor Data
  const channelId = 'COMP_1';
  const videoId = 'VID_1';
  repo.addCompetitor(channelId, 'Competitor One');
  repo.upsertCompetitorVideo({
    video_id: videoId,
    channel_id: channelId,
    title: 'Test Video',
    published_at: '2023-01-01'
  });

  // 2. Insert Snapshots (Simulate growth)
  // Day 1: 1000
  // Day 2: 1100 (+100)
  // Day 3: 1200 (+100)
  // Day 4: 2500 (+1300) -> Spike!
  
  repo.upsertCompetitorSnapshot({ video_id: videoId, day: '2023-01-01', view_count: 1000 });
  repo.upsertCompetitorSnapshot({ video_id: videoId, day: '2023-01-02', view_count: 1100 });
  repo.upsertCompetitorSnapshot({ video_id: videoId, day: '2023-01-03', view_count: 1200 });
  repo.upsertCompetitorSnapshot({ video_id: videoId, day: '2023-01-04', view_count: 2500 });

  // 3. Run Momentum Calculation for Day 4
  calculateMomentum(videoId, '2023-01-04');

  // 4. Verify Results
  const db = require('better-sqlite3')(dbPath);
  const result = db.prepare('SELECT * FROM competitor_video_momentum_day WHERE video_id = ? AND day = ?').get(videoId, '2023-01-04');

  console.log('Momentum Result:', result);

  if (!result) throw new Error('No momentum record found');
  if (result.velocity_24h !== 1300) throw new Error(`Expected velocity 1300, got ${result.velocity_24h}`);
  if (result.is_hit !== 1) throw new Error('Expected hit detection (1), got 0');

  console.log(`${GREEN}✓ Momentum & Hit Detection Passed${RESET}`);
  closeDb();
  process.exit(0);

} catch (e) {
  console.error(`${RED}Test Failed:${RESET}`, e);
  process.exit(1);
}
