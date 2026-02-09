import Database from 'better-sqlite3';
import { runMigrations } from './migrations';
import path from 'path';

let dbInstance: Database.Database | null = null;

export interface DbConfig {
  path: string;
  verbose?: boolean;
}

export const initDb = (config: DbConfig): Database.Database => {
  if (dbInstance) return dbInstance;

  console.log(`[DB] Connecting to ${config.path}`);
  
  try {
    dbInstance = new Database(config.path, { 
      verbose: config.verbose ? console.log : undefined 
    });
    
    // Enable WAL mode for better concurrency/performance
    dbInstance.pragma('journal_mode = WAL');
    
    // Run migrations
    runMigrations(dbInstance);
    
    return dbInstance;
  } catch (error) {
    console.error('[DB] Failed to initialize database', error);
    throw error;
  }
};

export const getDb = (): Database.Database => {
  if (!dbInstance) {
    throw new Error('Database not initialized. Call initDb first.');
  }
  return dbInstance;
};

export const closeDb = () => {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
};

export const checkIntegrity = (): string[] => {
  const db = getDb();
  const result = db.pragma('integrity_check') as { integrity_check: string }[];
  return result.map(r => r.integrity_check);
};

// Helper for App Meta
export const meta = {
  get: (key: string): string | null => {
    const db = getDb();
    const row = db.prepare('SELECT value FROM app_meta WHERE key = ?').get(key) as { value: string } | undefined;
    return row ? row.value : null;
  },
  set: (key: string, value: string) => {
    const db = getDb();
    db.prepare(`
      INSERT INTO app_meta (key, value) 
      VALUES (?, ?) 
      ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `).run(key, value);
  }
};
