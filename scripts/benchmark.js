const path = require('path');
const fs = require('fs');
const os = require('os');

// Mock Electron
const mockElectron = {
  app: { getPath: () => os.tmpdir() },
  BrowserWindow: class {
    constructor() {}
    loadURL() {}
    webContents = { printToPDF: async () => Buffer.from('pdf') }
    close() {}
  }
};
require.cache[require.resolve('electron')] = { exports: mockElectron };

const { initDb, closeDb, repo, perf } = require('../packages/core/dist/index.js');
const { generateReport } = require('../apps/desktop/dist-electron/main/report-service.js');

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const RESET = '\x1b[0m';

async function runBenchmark() {
  console.log('Running Performance Benchmark...');
  const TEST_DIR = path.join(os.tmpdir(), `bench-${Date.now()}`);
  fs.mkdirSync(TEST_DIR, { recursive: true });
  fs.mkdirSync(path.join(TEST_DIR, 'db'), { recursive: true });
  fs.mkdirSync(path.join(TEST_DIR, 'reports'), { recursive: true });

  const dbPath = path.join(TEST_DIR, 'db', 'insight.db');
  initDb({ path: dbPath });

  // 1. Seed Data (1000 videos, 365 days)
  console.log('Seeding Database (1000 videos x 365 days)...');
  const channelId = 'BENCH_CH';
  repo.upsertChannel({ channel_id: channelId, title: 'Benchmark Channel' });

  const videos = [];
  for (let i = 0; i < 1000; i++) {
    videos.push({
      video_id: `v_${i}`,
      channel_id: channelId,
      title: `Video ${i}`,
      published_at: '2023-01-01',
      duration_sec: 600
    });
  }
  repo.upsertVideosBatch(videos);

  // Seed Facts (Batching 365 days for channel)
  const channelFacts = [];
  const startDate = new Date('2023-01-01');
  for (let i = 0; i < 365; i++) {
    const d = new Date(startDate);
    d.setDate(d.getDate() + i);
    channelFacts.push({
      channel_id: channelId,
      day: d.toISOString().split('T')[0],
      views: 1000 + i,
      watch_time_minutes: 500,
      avg_view_duration_sec: 30,
      impressions: 5000,
      ctr: 5.0,
      subs_gained: 10,
      subs_lost: 1
    });
  }
  repo.upsertChannelDaysBatch(channelFacts);
  console.log('Seeding Complete.');

  // 2. Run Report Benchmark
  console.log('Benchmarking Report Generation (Standard 365d)...');
  const start = performance.now();
  
  await generateReport({
    dateFrom: new Date('2023-01-01'),
    dateTo: new Date('2023-12-31'),
    preset: '365d'
  }, 'standard');

  const end = performance.now();
  const duration = end - start;

  console.log(`Report Duration: ${duration.toFixed(2)}ms`);

  // Budget: 2000ms
  if (duration > 2000) {
    console.error(`${RED}[FAIL] Performance Budget Exceeded (Limit: 2000ms)${RESET}`);
    process.exit(1);
  } else {
    console.log(`${GREEN}[PASS] Performance Budget Met${RESET}`);
  }

  closeDb();
  // fs.rmSync(TEST_DIR, { recursive: true, force: true });
}

runBenchmark().catch(e => {
  console.error(e);
  process.exit(1);
});
