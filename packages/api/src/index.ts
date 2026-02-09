import { ApiConfig } from '@insight/shared';
import { IApiProvider } from './interfaces';
import { FakeProvider } from './providers/fake';
import { RecorderProvider } from './providers/recorder';
import { RealProvider } from './providers/real';
import { MockRealProvider } from './providers/mockReal';
import { RequestCache } from './utils/cache';
import { RateLimiter } from './utils/rateLimiter';

export * from './interfaces';
export * from './auth/googleAuth';

let apiInstance: IApiProvider | null = null;
let cacheInstance: RequestCache | null = null;
let limiterInstance: RateLimiter | null = null;

export const initApi = (config: ApiConfig): IApiProvider => {
  if (apiInstance) return apiInstance;

  console.log(`[API] Initializing with mode: ${config.providerMode}, Record: ${config.recordFixtures}`);

  // Initialize Utils
  cacheInstance = new RequestCache(config.paths.cache);
  limiterInstance = new RateLimiter(100, 10); // 100 tokens, refill 10/sec

  let provider: IApiProvider;

  if (config.providerMode === 'real') {
    // Use the actual RealProvider which talks to YouTube API
    // Pass cacheInstance to enable caching
    provider = new RealProvider(config.getAccessToken, cacheInstance);
  } else {
    provider = new FakeProvider(config.paths.fixtures);
  }

  // Wrap with Recorder if enabled
  if (config.recordFixtures) {
    provider = new RecorderProvider(provider, config.paths.fixtures);
  }

  apiInstance = provider;
  return provider;
};

export const getApi = (): IApiProvider => {
  if (!apiInstance) {
    throw new Error('API not initialized. Call initApi first.');
  }
  return apiInstance;
};
