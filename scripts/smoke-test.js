const path = require('path');
const fs = require('fs');
const os = require('os');

// 1. Setup Test Environment
const TEST_ID = Date.now();
const TEST_DIR = path.join(os.tmpdir(), `insight-smoke-${TEST_ID}`);

if (!fs.existsSync(TEST_DIR)) {
  fs.mkdirSync(TEST_DIR, { recursive: true });
}

console.log(`[Smoke] Test Directory: ${TEST_DIR}`);

// 2. Mock Electron
// We mock app.getPath to return our controlled TEST_DIR
const mockElectron = {
  app: { 
    getPath: (name) => {
      if (name === 'userData') return TEST_DIR;
      return TEST_DIR;
    } 
  },
  BrowserWindow: class {
    constructor() {}
    loadURL() {}
    webContents = { 
      printToPDF: async () => Buffer.from('%PDF-1.4...MockPDF...') 
    }
    close() {}
  }
};

// Inject mock into require cache
require.cache[require.resolve('electron')] = { exports: mockElectron };

// 3. Import Core/API (Must happen AFTER mocking)
// Note: These require the packages to be built (pnpm build:all)
const { initDb, closeDb, SyncOrchestrator, perf, repo, getDb } = require('../packages/core/dist/index.js');
const { initApi, getApi } = require('../packages/api/dist/index.js');
const { generateReport } = require('../apps/desktop/dist-electron/main/report-service.js');

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const RESET = '\x1b[0m';

async function runSmokeTest() {
  console.log('[Smoke] Starting...');

  try {
    // A. Initialize Infrastructure
    const dbPath = path.join(TEST_DIR, 'db', 'insight.db');
    // Ensure db dir exists (fs-utils usually does this, but we are bypassing main process init)
    fs.mkdirSync(path.join(TEST_DIR, 'db'), { recursive: true });
    fs.mkdirSync(path.join(TEST_DIR, 'reports'), { recursive: true });
    fs.mkdirSync(path.join(TEST_DIR, 'logs'), { recursive: true });
    
    initDb({ path: dbPath });
    console.log(`${GREEN}✓ DB Initialized${RESET}`);

    const fixturesDir = path.join(__dirname, '../packages/api/fixtures');
    initApi({
      paths: { 
        userData: TEST_DIR,
        fixtures: fixturesDir, 
        cache: path.join(TEST_DIR, 'cache') 
      },
      providerMode: 'fake',
      recordFixtures: false,
      getAccessToken: async () => 'fake_token'
    });
    console.log(`${GREEN}✓ API Initialized (Fake Mode)${RESET}`);

    // B. Run Sync
    console.log('[Smoke] Running Sync...');
    const orchestrator = new SyncOrchestrator(getApi(), (p) => {
      // process.stdout.write(`\r[Sync] ${p.stage}: ${p.progress}%`);
    });

    const startSync = performance.now();
    await orchestrator.run({
      dateFrom: new Date('2023-01-01'),
      dateTo: new Date('2023-01-28'),
      preset: '28d'
    });
    const endSync = performance.now();
    console.log(`\n${GREEN}✓ Sync Completed in ${(endSync - startSync).toFixed(0)}ms${RESET}`);

    // C. Validate DB Content
    const db = getDb();
    const channelCount = db.prepare('SELECT COUNT(*) as c FROM dim_channel').get().c;
    const videoCount = db.prepare('SELECT COUNT(*) as c FROM dim_video').get().c;
    const factCount = db.prepare('SELECT COUNT(*) as c FROM fact_channel_day').get().c;

    console.log(`[Smoke] DB Stats: Channels=${channelCount}, Videos=${videoCount}, Facts=${factCount}`);

    if (channelCount < 1) throw new Error('DB Validation Failed: No channels found.');
    if (videoCount < 1) throw new Error('DB Validation Failed: No videos found.');
    if (factCount < 20) throw new Error('DB Validation Failed: Insufficient daily facts.');
    console.log(`${GREEN}✓ DB Content Validated${RESET}`);

    // D. Generate Report
    console.log('[Smoke] Generating Report...');
    const startReport = performance.now();
    const pdfPath = await generateReport({
      dateFrom: new Date('2023-01-01'),
      dateTo: new Date('2023-01-28'),
      preset: '28d'
    }, 'standard');
    const endReport = performance.now();
    
    console.log(`[Smoke] Report Path: ${pdfPath}`);
    
    if (!fs.existsSync(pdfPath)) {
      throw new Error(`Report Validation Failed: File not found at ${pdfPath}`);
    }
    
    const stats = fs.statSync(pdfPath);
    if (stats.size === 0) {
      throw new Error('Report Validation Failed: File is empty');
    }

    console.log(`${GREEN}✓ Report Generated & Verified (${(endReport - startReport).toFixed(0)}ms)${RESET}`);

    // E. Cleanup
    closeDb();
    // Optional: fs.rmSync(TEST_DIR, { recursive: true, force: true });
    console.log(`${GREEN}✓ Smoke Test Passed Successfully${RESET}`);
    process.exit(0);

  } catch (e) {
    console.error(`\n${RED}[Smoke] FAILED:${RESET}`, e);
    process.exit(1);
  }
}

runSmokeTest();
