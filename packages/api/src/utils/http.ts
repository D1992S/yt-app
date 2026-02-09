import { RequestCache } from './cache';
import { AppError } from '@insight/shared';

export class HttpClient {
  private getAccessToken: () => Promise<string | null>;
  private cache?: RequestCache;

  constructor(getAccessToken: () => Promise<string | null>, cache?: RequestCache) {
    this.getAccessToken = getAccessToken;
    this.cache = cache;
  }

  private async delay(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async fetchWithRetry(url: string, options: RequestInit = {}, retries = 3, useCache = true): Promise<any> {
    // 1. Check Cache
    if (useCache && this.cache && options.method !== 'POST' && options.method !== 'PUT' && options.method !== 'DELETE') {
      const cacheKey = `${url}|${JSON.stringify(options.body || {})}`;
      const cached = this.cache.get(cacheKey);
      if (cached) {
        return cached;
      }
    }

    const token = await this.getAccessToken();
    if (!token) {
      throw new AppError('AUTH_ERROR', 'No access token available', false);
    }

    const headers = {
      ...options.headers,
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    };

    let lastError: any;

    for (let i = 0; i < retries; i++) {
      try {
        const response = await fetch(url, { ...options, headers });

        if (response.ok) {
          const data = await response.json();
          // 2. Set Cache
          if (useCache && this.cache && options.method !== 'POST') {
            const cacheKey = `${url}|${JSON.stringify(options.body || {})}`;
            this.cache.set(cacheKey, data);
          }
          return data;
        }

        if (response.status === 401) {
          throw new AppError('AUTH_ERROR', 'Unauthorized: Token expired or invalid', false);
        }

        if (response.status === 403) {
          const err = await response.json();
          const reason = err?.error?.errors?.[0]?.reason;
          if (reason === 'quotaExceeded') {
            throw new AppError('QUOTA_EXCEEDED', 'API Quota Exceeded', true);
          }
          throw new AppError('AUTH_ERROR', 'Forbidden access', false);
        }

        if (response.status === 429 || response.status >= 500) {
          const baseDelay = Math.pow(2, i) * 1000;
          const jitter = Math.random() * 500;
          const backoff = baseDelay + jitter;
          
          console.warn(`[HTTP] Request failed (${response.status}). Retrying in ${backoff.toFixed(0)}ms...`);
          await this.delay(backoff);
          continue;
        }

        throw new AppError('NETWORK_ERROR', `HTTP Error ${response.status}: ${response.statusText}`, true);
      } catch (error) {
        lastError = error;
        // Don't retry on auth errors or quota errors if they were thrown as AppError
        if (error instanceof AppError && !error.isRetryable) {
          throw error;
        }
        
        const baseDelay = Math.pow(2, i) * 1000;
        const jitter = Math.random() * 500;
        await this.delay(baseDelay + jitter);
      }
    }

    if (lastError instanceof AppError) throw lastError;
    throw new AppError('NETWORK_ERROR', 'Request failed after retries', true, lastError);
  }
}
