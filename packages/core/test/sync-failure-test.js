const { initDb, closeDb, SyncOrchestrator, repo } = require('../dist/index.js');
const path = require('path');
const fs = require('fs');
const os = require('os');

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const RESET = '\x1b[0m';

console.log('Running Sync Failure & Retry Test...');

const tmpDir = os.tmpdir();
const dbPath = path.join(tmpDir, `test-fail-${Date.now()}.sqlite`);

// Mock API Provider that fails deterministically
class FlakyProvider {
  constructor() {
    this.attempts = 0;
  }

  async getChannel() {
    return { id: 'FLAKY_CH', title: 'Flaky Channel', createdAt: '2020-01-01' };
  }

  async listVideos() {
    this.attempts++;
    if (this.attempts < 3) {
      console.log(`[MockAPI] Simulating 429/Timeout (Attempt ${this.attempts})`);
      throw new Error('HTTP Error 429: Too Many Requests');
    }
    console.log(`[MockAPI] Success (Attempt ${this.attempts})`);
    return [{ id: 'v1', title: 'Video 1', publishedAt: '2023-01-01', durationSec: 600 }];
  }

  async getChannelDailyMetrics() { return []; }
  async getVideoDailyMetrics() { return {}; }
  async getPublicVideos() { return []; }
}

// Mock HttpClient to test retry logic directly (optional, but good for unit testing http.ts)
// Here we test the Orchestrator's resilience to provider failures.

try {
  initDb({ path: dbPath });

  // 1. Test Retry Logic via Orchestrator
  // The Orchestrator doesn't retry itself, it relies on the Provider/HttpClient.
  // However, if the Provider throws, the Orchestrator should catch and fail gracefully.
  // We want to verify that if we wrap the FlakyProvider with a retry mechanism (like HttpClient does), it works.
  
  // Since we can't easily inject HttpClient into FlakyProvider here without importing it,
  // we will simulate the Orchestrator failing and then resuming.

  const flakyApi = new FlakyProvider();
  
  // Wrap flaky API with a simple retry proxy to simulate HttpClient behavior
  const retryProxy = new Proxy(flakyApi, {
    get(target, prop) {
      const val = target[prop];
      if (typeof val === 'function') {
        return async (...args) => {
          for (let i = 0; i < 3; i++) {
            try {
              return await val.apply(target, args);
            } catch (e) {
              if (i === 2) throw e;
              await new Promise(r => setTimeout(r, 100)); // fast retry for test
            }
          }
        };
      }
      return val;
    }
  });

  const orchestrator = new SyncOrchestrator(retryProxy, (p) => {
    console.log(`[Sync] ${p.stage}: ${p.progress}%`);
  });

  console.log('Starting Sync with Flaky Provider...');
  await orchestrator.run({
    dateFrom: new Date('2023-01-01'),
    dateTo: new Date('2023-01-02'),
    preset: 'custom'
  });

  console.log(`${GREEN}✓ Sync Completed after retries${RESET}`);

  // 2. Verify Data
  const videos = repo.getAllVideos();
  if (videos.length !== 1) throw new Error('Sync failed to save video after retry');
  
  console.log(`${GREEN}✓ Data Verification Passed${RESET}`);

  closeDb();
  process.exit(0);

} catch (e) {
  console.error(`${RED}Test Failed:${RESET}`, e);
  process.exit(1);
}
