import { afterEach, describe, expect, it } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { closeDb, initDb } from '../client';
import { repo } from '../repo';

const hasBetterSqliteBinding = () => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const BetterSqlite = require('better-sqlite3');
    const db = new BetterSqlite(':memory:');
    db.close();
    return true;
  } catch {
    return false;
  }
};

describe('llm settings persistence', () => {
  const dbPath = path.join(os.tmpdir(), `insight-llm-settings-${Date.now()}.sqlite`);

  afterEach(() => {
    closeDb();
  });

  const itIfSqliteAvailable = hasBetterSqliteBinding() ? it : it.skip;

  itIfSqliteAvailable('saves and reads LLM settings after db restart', () => {
    initDb({ path: dbPath });

    const saved = repo.saveLlmSettings({
      provider: 'openai',
      model: 'gpt-4o-mini',
      temperature: 0.7,
      maxOutputTokens: 333,
    }, 11);

    expect(saved.provider).toBe('openai');
    expect(saved.model).toBe('gpt-4o-mini');

    closeDb();
    initDb({ path: dbPath });

    const restored = repo.getLlmSettings(11);
    expect(restored).toMatchObject({
      provider: 'openai',
      model: 'gpt-4o-mini',
      temperature: 0.7,
      maxOutputTokens: 333,
    });

    fs.rmSync(dbPath, { force: true });
    fs.rmSync(`${dbPath}-wal`, { force: true });
    fs.rmSync(`${dbPath}-shm`, { force: true });
  });
});
