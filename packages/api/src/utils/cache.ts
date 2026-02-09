import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export class RequestCache {
  private cacheDir: string;
  private defaultTtlMs: number;

  constructor(cacheDir: string, defaultTtlMs: number = 1000 * 60 * 60) { // 1 hour default
    this.cacheDir = cacheDir;
    this.defaultTtlMs = defaultTtlMs;
    
    if (!fs.existsSync(this.cacheDir)) {
      fs.mkdirSync(this.cacheDir, { recursive: true });
    }
  }

  private getHash(key: string): string {
    return crypto.createHash('md5').update(key).digest('hex');
  }

  get<T>(key: string): T | null {
    const hash = this.getHash(key);
    const filePath = path.join(this.cacheDir, `${hash}.json`);

    if (!fs.existsSync(filePath)) {
      return null;
    }

    try {
      const stats = fs.statSync(filePath);
      const age = Date.now() - stats.mtimeMs;

      if (age > this.defaultTtlMs) {
        // Expired
        fs.unlinkSync(filePath);
        return null;
      }

      const content = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(content) as T;
    } catch (e) {
      console.error(`Cache read error for ${key}:`, e);
      return null;
    }
  }

  set(key: string, data: any): void {
    const hash = this.getHash(key);
    const filePath = path.join(this.cacheDir, `${hash}.json`);

    try {
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    } catch (e) {
      console.error(`Cache write error for ${key}:`, e);
    }
  }
}
