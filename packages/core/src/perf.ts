import { getDb } from './db/client';

export interface PerfEvent {
  id: number;
  name: string;
  duration_ms: number;
  created_at: string;
  meta?: string;
}

export const perf = {
  measure: async <T>(name: string, fn: () => Promise<T>, metaData?: any): Promise<T> => {
    const start = performance.now();
    try {
      const result = await fn();
      const end = performance.now();
      const duration = Math.round(end - start);
      
      try {
        const db = getDb();
        db.prepare('INSERT INTO perf_events (name, duration_ms, created_at, meta) VALUES (?, ?, ?, ?)').run(
          name,
          duration,
          new Date().toISOString(),
          metaData ? JSON.stringify(metaData) : null
        );
      } catch (e) {
        console.error('Failed to save perf event', e);
      }
      
      return result;
    } catch (e) {
      throw e;
    }
  },

  getStats: (limit = 20): PerfEvent[] => {
    const db = getDb();
    return db.prepare(`
      SELECT * FROM perf_events 
      ORDER BY duration_ms DESC 
      LIMIT ?
    `).all(limit) as PerfEvent[];
  }
};
