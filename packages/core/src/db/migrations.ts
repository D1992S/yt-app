import Database from 'better-sqlite3';

interface Migration {
  id: number;
  name: string;
  up: string;
}

const MIGRATIONS: Migration[] = [
  {
    id: 1,
    name: 'init_schema',
    up: `
      CREATE TABLE IF NOT EXISTS migrations (
        id INTEGER PRIMARY KEY,
        applied_at TEXT NOT NULL
      );
      
      CREATE TABLE IF NOT EXISTS app_meta (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
    `
  },
  {
    id: 2,
    name: 'schema_v1_analytics',
    up: `
      CREATE TABLE dim_channel (
        channel_id TEXT PRIMARY KEY,
        title TEXT,
        created_at TEXT,
        raw_json TEXT
      );

      CREATE TABLE dim_video (
        video_id TEXT PRIMARY KEY,
        channel_id TEXT,
        title TEXT,
        published_at TEXT,
        duration_sec INTEGER,
        raw_json TEXT,
        FOREIGN KEY(channel_id) REFERENCES dim_channel(channel_id)
      );

      CREATE TABLE fact_channel_day (
        channel_id TEXT,
        day TEXT,
        views INTEGER,
        watch_time_minutes REAL,
        avg_view_duration_sec REAL,
        impressions INTEGER,
        ctr REAL,
        subs_gained INTEGER,
        subs_lost INTEGER,
        PRIMARY KEY (channel_id, day),
        FOREIGN KEY(channel_id) REFERENCES dim_channel(channel_id)
      );

      CREATE TABLE fact_video_day (
        video_id TEXT,
        day TEXT,
        views INTEGER,
        watch_time_minutes REAL,
        avg_view_duration_sec REAL,
        impressions INTEGER,
        ctr REAL,
        likes INTEGER,
        comments INTEGER,
        PRIMARY KEY (video_id, day),
        FOREIGN KEY(video_id) REFERENCES dim_video(video_id)
      );

      CREATE TABLE sync_runs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        started_at TEXT,
        finished_at TEXT,
        status TEXT,
        mode TEXT,
        message TEXT
      );

      CREATE TABLE raw_blobs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        kind TEXT,
        key TEXT,
        fetched_at TEXT,
        content_json TEXT
      );

      CREATE INDEX idx_fact_channel_day_day ON fact_channel_day(day);
      CREATE INDEX idx_fact_video_day_day ON fact_video_day(day);
      CREATE INDEX idx_dim_video_channel_id ON dim_video(channel_id);
      CREATE INDEX idx_raw_blobs_key ON raw_blobs(key);
    `
  },
  {
    id: 3,
    name: 'perf_events',
    up: `
      CREATE TABLE perf_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        duration_ms INTEGER NOT NULL,
        created_at TEXT NOT NULL,
        meta TEXT
      );
      CREATE INDEX idx_perf_created_at ON perf_events(created_at);
    `
  },
  {
    id: 4,
    name: 'snapshots_and_plugins',
    up: `
      CREATE TABLE snapshot_runs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        created_at TEXT NOT NULL,
        type TEXT NOT NULL
      );

      CREATE TABLE snapshot_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        run_id INTEGER,
        scope TEXT,
        entity_id TEXT,
        day TEXT,
        kind TEXT,
        payload_json TEXT,
        FOREIGN KEY(run_id) REFERENCES snapshot_runs(id)
      );

      CREATE TABLE insights (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        run_id INTEGER,
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        evidence_json TEXT,
        created_at TEXT NOT NULL
      );

      CREATE TABLE scores (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        entity_id TEXT,
        score_type TEXT,
        value REAL,
        created_at TEXT
      );

      CREATE TABLE alerts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        severity TEXT,
        message TEXT,
        is_read INTEGER DEFAULT 0,
        created_at TEXT
      );
    `
  },
  {
    id: 5,
    name: 'competitors_v1',
    up: `
      CREATE TABLE competitor_channels (
        channel_id TEXT PRIMARY KEY,
        title TEXT,
        custom_url TEXT,
        added_at TEXT
      );

      CREATE TABLE competitor_videos (
        video_id TEXT PRIMARY KEY,
        channel_id TEXT,
        title TEXT,
        published_at TEXT,
        FOREIGN KEY(channel_id) REFERENCES competitor_channels(channel_id)
      );

      CREATE TABLE competitor_video_day_snapshot (
        video_id TEXT,
        day TEXT,
        view_count INTEGER,
        PRIMARY KEY (video_id, day),
        FOREIGN KEY(video_id) REFERENCES competitor_videos(video_id)
      );

      CREATE TABLE competitor_video_momentum_day (
        video_id TEXT,
        day TEXT,
        velocity_24h INTEGER,
        velocity_7d INTEGER,
        momentum_score REAL,
        is_hit INTEGER DEFAULT 0,
        PRIMARY KEY (video_id, day),
        FOREIGN KEY(video_id) REFERENCES competitor_videos(video_id)
      );

      CREATE INDEX idx_comp_snapshot_day ON competitor_video_day_snapshot(day);
      CREATE INDEX idx_comp_momentum_hit ON competitor_video_momentum_day(is_hit);
    `
  },
  {
    id: 6,
    name: 'topics_and_ml',
    up: `
      CREATE TABLE topic_clusters (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        created_at TEXT
      );

      CREATE TABLE topic_cluster_membership (
        video_id TEXT,
        cluster_id INTEGER,
        distance REAL,
        PRIMARY KEY (video_id),
        FOREIGN KEY(cluster_id) REFERENCES topic_clusters(id)
      );

      CREATE TABLE topic_gap_scores (
        cluster_id INTEGER,
        gap_score REAL,
        reason TEXT,
        created_at TEXT,
        FOREIGN KEY(cluster_id) REFERENCES topic_clusters(id)
      );

      CREATE TABLE topic_pressure_day (
        cluster_id INTEGER,
        day TEXT,
        publication_count INTEGER,
        momentum_sum REAL,
        PRIMARY KEY (cluster_id, day),
        FOREIGN KEY(cluster_id) REFERENCES topic_clusters(id)
      );

      CREATE TABLE ml_feature_sets (
        hash TEXT PRIMARY KEY,
        version TEXT,
        created_at TEXT,
        meta_json TEXT
      );
    `
  },
  {
    id: 7,
    name: 'ml_model_registry',
    up: `
      CREATE TABLE ml_models (
        model_id TEXT PRIMARY KEY,
        type TEXT NOT NULL, -- 'forecast' | 'scoring'
        version TEXT NOT NULL,
        trained_at TEXT NOT NULL,
        metrics_json TEXT,
        artifacts_path TEXT,
        feature_version TEXT,
        is_active INTEGER DEFAULT 0
      );
    `
  },
  {
    id: 8,
    name: 'nowcast_quality_alerts',
    up: `
      CREATE TABLE video_growth_curves (
        cluster_id INTEGER,
        duration_bucket TEXT, -- 'short', 'medium', 'long'
        day_number INTEGER,
        median_pct_of_day28 REAL,
        p25_pct_of_day28 REAL,
        p75_pct_of_day28 REAL,
        PRIMARY KEY (cluster_id, duration_bucket, day_number)
      );

      CREATE TABLE video_quality_scores (
        video_id TEXT PRIMARY KEY,
        score REAL,
        velocity_score REAL,
        efficiency_score REAL,
        conversion_score REAL,
        explain_json TEXT,
        updated_at TEXT,
        FOREIGN KEY(video_id) REFERENCES dim_video(video_id)
      );

      ALTER TABLE alerts ADD COLUMN action_json TEXT;
      ALTER TABLE alerts ADD COLUMN entity_id TEXT;
    `
  },
  {
    id: 9,
    name: 'transcripts_fts_chapters_imports',
    up: `
      CREATE TABLE video_transcripts (
        video_id TEXT PRIMARY KEY,
        content TEXT, -- Raw content (SRT/VTT)
        plain_text TEXT, -- Stripped text for FTS
        format TEXT,
        updated_at TEXT,
        FOREIGN KEY(video_id) REFERENCES dim_video(video_id)
      );

      -- FTS5 Virtual Table
      CREATE VIRTUAL TABLE videos_fts USING fts5(video_id UNINDEXED, title, content);

      CREATE TABLE video_chapters (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        video_id TEXT,
        start_seconds INTEGER,
        title TEXT,
        FOREIGN KEY(video_id) REFERENCES dim_video(video_id)
      );

      CREATE TABLE video_retention (
        video_id TEXT PRIMARY KEY,
        curve_json TEXT, -- Array of {seconds, pct}
        drop_points_json TEXT, -- Detected drops
        updated_at TEXT,
        FOREIGN KEY(video_id) REFERENCES dim_video(video_id)
      );

      CREATE TABLE data_imports (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        filename TEXT,
        status TEXT,
        rows_processed INTEGER,
        created_at TEXT
      );
    `
  },
  {
    id: 10,
    name: 'lab_backlog_calendar',
    up: `
      CREATE TABLE video_notes (
        video_id TEXT PRIMARY KEY,
        tags TEXT, -- JSON array
        style_tags TEXT, -- JSON array
        notes TEXT,
        FOREIGN KEY(video_id) REFERENCES dim_video(video_id)
      );

      CREATE TABLE thumbnail_assets (
        video_id TEXT PRIMARY KEY,
        url TEXT,
        local_path TEXT,
        style_tags TEXT,
        FOREIGN KEY(video_id) REFERENCES dim_video(video_id)
      );

      CREATE TABLE ideas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT,
        cluster_id INTEGER,
        source TEXT,
        effort INTEGER,
        status TEXT DEFAULT 'backlog',
        created_at TEXT
      );

      CREATE TABLE idea_scores (
        idea_id INTEGER PRIMARY KEY,
        score REAL,
        explain_json TEXT,
        updated_at TEXT,
        FOREIGN KEY(idea_id) REFERENCES ideas(id)
      );

      CREATE TABLE content_plan (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        target_date TEXT,
        cluster_id INTEGER,
        status TEXT DEFAULT 'planned'
      );

      CREATE TABLE export_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        path TEXT,
        type TEXT,
        created_at TEXT
      );
    `
  },
  {
    id: 11,
    name: 'llm_safeguards',
    up: `
      CREATE TABLE llm_cache (
        hash TEXT PRIMARY KEY,
        response TEXT,
        created_at TEXT
      );

      CREATE TABLE llm_usage (
        day TEXT PRIMARY KEY,
        tokens_used INTEGER DEFAULT 0,
        cost_estimate REAL DEFAULT 0
      );
    `
  },
  {
    id: 12,
    name: 'profiles',
    up: `
      CREATE TABLE profiles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        channel_id TEXT NOT NULL,
        settings_json TEXT,
        is_active INTEGER DEFAULT 0
      );

      -- Add profile_id to competitor_channels to isolate them per profile
      ALTER TABLE competitor_channels ADD COLUMN profile_id INTEGER;
    `
  },
  {
    id: 13,
    name: 'fix_competitor_pk_and_indexes',
    up: `
      -- 1. Fix Competitor Channels PK to allow same channel in multiple profiles
      CREATE TABLE competitor_channels_new (
        channel_id TEXT,
        profile_id INTEGER,
        title TEXT,
        custom_url TEXT,
        added_at TEXT,
        PRIMARY KEY (channel_id, profile_id)
      );
      
      INSERT INTO competitor_channels_new (channel_id, profile_id, title, custom_url, added_at)
      SELECT channel_id, COALESCE(profile_id, 0), title, custom_url, added_at FROM competitor_channels;
      
      DROP TABLE competitor_channels;
      ALTER TABLE competitor_channels_new RENAME TO competitor_channels;

      -- 2. Add Composite Indexes for Performance
      CREATE INDEX IF NOT EXISTS idx_fact_channel_day_composite ON fact_channel_day(channel_id, day);
      CREATE INDEX IF NOT EXISTS idx_fact_video_day_composite ON fact_video_day(video_id, day);
    `
  },
  {
    id: 14,
    name: 'missing_indexes',
    up: `
      CREATE INDEX IF NOT EXISTS idx_insights_run_id ON insights(run_id);
      CREATE INDEX IF NOT EXISTS idx_scores_entity_id ON scores(entity_id);
      CREATE INDEX IF NOT EXISTS idx_alerts_is_read ON alerts(is_read);
      CREATE INDEX IF NOT EXISTS idx_topic_mem_cluster_id ON topic_cluster_membership(cluster_id);
    `
  },
  {
    id: 15,
    name: 'llm_settings',
    up: `
      CREATE TABLE llm_settings (
        profile_id INTEGER PRIMARY KEY,
        provider TEXT NOT NULL,
        model TEXT NOT NULL,
        temperature REAL NOT NULL DEFAULT 0.3,
        max_output_tokens INTEGER NOT NULL DEFAULT 1024,
        updated_at TEXT NOT NULL,
        FOREIGN KEY(profile_id) REFERENCES profiles(id)
      );
    `
  }
];

export const runMigrations = (db: Database.Database) => {
  // Ensure migrations table exists first (bootstrap)
  db.exec(`
    CREATE TABLE IF NOT EXISTS migrations (
      id INTEGER PRIMARY KEY,
      applied_at TEXT NOT NULL
    );
  `);

  const getApplied = db.prepare('SELECT id FROM migrations').pluck();
  const appliedIds = new Set(getApplied.all() as number[]);

  const runTransaction = db.transaction((migrations: Migration[]) => {
    for (const migration of migrations) {
      if (!appliedIds.has(migration.id)) {
        console.log(`[DB] Running migration ${migration.id}: ${migration.name}`);
        db.exec(migration.up);
        db.prepare('INSERT INTO migrations (id, applied_at) VALUES (?, ?)').run(
          migration.id,
          new Date().toISOString()
        );
      }
    }
  });

  runTransaction(MIGRATIONS);
};
