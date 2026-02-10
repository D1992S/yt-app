import { getDb } from './client';
import { parseSrtToText } from '../utils/parsers';
import { perf } from '../perf';

// --- Types for DB Operations ---
interface DbChannel { channel_id: string; title: string; created_at?: string; raw_json?: string; }
interface DbVideo { video_id: string; channel_id: string; title: string; published_at?: string; duration_sec?: number; raw_json?: string; }
interface DbChannelFact { channel_id: string; day: string; views: number; watch_time_minutes: number; avg_view_duration_sec: number; impressions: number; ctr: number; subs_gained: number; subs_lost: number; }
interface DbVideoFact { video_id: string; day: string; views: number; watch_time_minutes: number; avg_view_duration_sec: number; impressions: number; ctr: number; likes: number; comments: number; }
interface DbCompetitorVideo { video_id: string; channel_id: string; title: string; published_at: string; }
interface DbCompetitorSnapshot { video_id: string; day: string; view_count: number; }
interface DbMomentum { video_id: string; day: string; velocity_24h: number; velocity_7d: number; momentum_score: number; is_hit: number; }
interface DbVideoNote { videoId: string; tags: string[]; styleTags: string[]; notes: string; }
interface DbIdea { id?: number; title: string; description: string; clusterId?: number; source: string; effort: number; status: string; }
interface DbIdeaScore { ideaId: number; score: number; explainJson: string; }
interface DbContentPlan { id?: number; title: string; targetDate: string; clusterId?: number; status: string; }
interface DbQualityScore { video_id: string; score: number; velocity_score: number; efficiency_score: number; conversion_score: number; explain_json: string; updated_at?: string; }
interface DbAlert { severity: string; message: string; entity_id?: string; action_json?: string; }
interface DbGrowthCurve { cluster_id: number; duration_bucket: string; day_number: number; median_pct: number; p25_pct: number; p75_pct: number; }
interface DbModel { model_id: string; type: string; version: string; trained_at: string; metrics_json: string; is_active: number; }

export interface DbLlmSettings {
  provider: 'openai' | 'gemini';
  model: string;
  temperature: number;
  maxOutputTokens: number;
  updatedAt?: string;
}

const DEFAULT_LLM_SETTINGS: DbLlmSettings = {
  provider: 'gemini',
  model: 'gemini-2.5-flash',
  temperature: 0.3,
  maxOutputTokens: 1024,
};

// --- Helper for Deduplication ---
const runUpsert = (sql: string, params: Record<string, unknown>) => {
  const db = getDb();
  db.prepare(sql).run(params);
};

const runBatchUpsert = (sql: string, items: unknown[]) => {
  const db = getDb();
  const stmt = db.prepare(sql);
  const transaction = db.transaction((rows) => {
    for (const row of rows) stmt.run(row);
  });
  transaction(items);
};

export const repo = {
  // --- Dimensions ---
  upsertChannel: (channel: DbChannel) => {
    runUpsert(`
      INSERT INTO dim_channel (channel_id, title, created_at, raw_json)
      VALUES (@channel_id, @title, @created_at, @raw_json)
      ON CONFLICT(channel_id) DO UPDATE SET
        title = excluded.title,
        created_at = COALESCE(excluded.created_at, dim_channel.created_at),
        raw_json = COALESCE(excluded.raw_json, dim_channel.raw_json)
    `, channel as unknown as Record<string, unknown>);
  },

  upsertVideo: (video: DbVideo) => {
    const db = getDb();
    const transaction = db.transaction(() => {
      db.prepare(`
        INSERT INTO dim_video (video_id, channel_id, title, published_at, duration_sec, raw_json)
        VALUES (@video_id, @channel_id, @title, @published_at, @duration_sec, @raw_json)
        ON CONFLICT(video_id) DO UPDATE SET
          title = excluded.title,
          channel_id = excluded.channel_id,
          published_at = COALESCE(excluded.published_at, dim_video.published_at),
          duration_sec = COALESCE(excluded.duration_sec, dim_video.duration_sec),
          raw_json = COALESCE(excluded.raw_json, dim_video.raw_json)
      `).run(video);

      db.prepare(`
        INSERT INTO videos_fts (video_id, title, content) 
        VALUES (@video_id, @title, '') 
        ON CONFLICT(video_id) DO UPDATE SET title = excluded.title
      `).run({ video_id: video.video_id, title: video.title });
    });
    transaction();
  },

  upsertVideosBatch: (videos: DbVideo[]) => {
    const db = getDb();
    const stmt = db.prepare(`
      INSERT INTO dim_video (video_id, channel_id, title, published_at, duration_sec, raw_json)
      VALUES (@video_id, @channel_id, @title, @published_at, @duration_sec, @raw_json)
      ON CONFLICT(video_id) DO UPDATE SET
        title = excluded.title,
        channel_id = excluded.channel_id,
        published_at = COALESCE(excluded.published_at, dim_video.published_at),
        duration_sec = COALESCE(excluded.duration_sec, dim_video.duration_sec),
        raw_json = COALESCE(excluded.raw_json, dim_video.raw_json)
    `);
    const ftsStmt = db.prepare(`
      INSERT INTO videos_fts (video_id, title, content) 
      VALUES (@video_id, @title, '') 
      ON CONFLICT(video_id) DO UPDATE SET title = excluded.title
    `);
    const transaction = db.transaction((items: DbVideo[]) => {
      for (const item of items) {
        stmt.run(item);
        ftsStmt.run({ video_id: item.video_id, title: item.title });
      }
    });
    transaction(videos);
  },

  // --- Facts ---
  upsertChannelDay: (fact: DbChannelFact) => {
    runUpsert(`
      INSERT INTO fact_channel_day (channel_id, day, views, watch_time_minutes, avg_view_duration_sec, impressions, ctr, subs_gained, subs_lost)
      VALUES (@channel_id, @day, @views, @watch_time_minutes, @avg_view_duration_sec, @impressions, @ctr, @subs_gained, @subs_lost)
      ON CONFLICT(channel_id, day) DO UPDATE SET
        views = excluded.views,
        watch_time_minutes = excluded.watch_time_minutes,
        avg_view_duration_sec = excluded.avg_view_duration_sec,
        impressions = excluded.impressions,
        ctr = excluded.ctr,
        subs_gained = excluded.subs_gained,
        subs_lost = excluded.subs_lost
    `, fact as unknown as Record<string, unknown>);
  },

  upsertChannelDaysBatch: (facts: DbChannelFact[]) => {
    runBatchUpsert(`
      INSERT INTO fact_channel_day (channel_id, day, views, watch_time_minutes, avg_view_duration_sec, impressions, ctr, subs_gained, subs_lost)
      VALUES (@channel_id, @day, @views, @watch_time_minutes, @avg_view_duration_sec, @impressions, @ctr, @subs_gained, @subs_lost)
      ON CONFLICT(channel_id, day) DO UPDATE SET
        views = excluded.views,
        watch_time_minutes = excluded.watch_time_minutes,
        avg_view_duration_sec = excluded.avg_view_duration_sec,
        impressions = excluded.impressions,
        ctr = excluded.ctr,
        subs_gained = excluded.subs_gained,
        subs_lost = excluded.subs_lost
    `, facts);
  },

  upsertVideoDay: (fact: DbVideoFact) => {
    runUpsert(`
      INSERT INTO fact_video_day (video_id, day, views, watch_time_minutes, avg_view_duration_sec, impressions, ctr, likes, comments)
      VALUES (@video_id, @day, @views, @watch_time_minutes, @avg_view_duration_sec, @impressions, @ctr, @likes, @comments)
      ON CONFLICT(video_id, day) DO UPDATE SET
        views = excluded.views,
        watch_time_minutes = excluded.watch_time_minutes,
        avg_view_duration_sec = excluded.avg_view_duration_sec,
        impressions = excluded.impressions,
        ctr = excluded.ctr,
        likes = excluded.likes,
        comments = excluded.comments
    `, fact as unknown as Record<string, unknown>);
  },

  upsertVideoDaysBatch: (facts: DbVideoFact[]) => {
    runBatchUpsert(`
      INSERT INTO fact_video_day (video_id, day, views, watch_time_minutes, avg_view_duration_sec, impressions, ctr, likes, comments)
      VALUES (@video_id, @day, @views, @watch_time_minutes, @avg_view_duration_sec, @impressions, @ctr, @likes, @comments)
      ON CONFLICT(video_id, day) DO UPDATE SET
        views = excluded.views,
        watch_time_minutes = excluded.watch_time_minutes,
        avg_view_duration_sec = excluded.avg_view_duration_sec,
        impressions = excluded.impressions,
        ctr = excluded.ctr,
        likes = excluded.likes,
        comments = excluded.comments
    `, facts);
  },
  
  getChannelStats: (channelId: string, start: string, end: string) => {
    const db = getDb();
    return db.prepare(`
      SELECT * FROM fact_channel_day 
      WHERE channel_id = ? AND day >= ? AND day <= ?
      ORDER BY day ASC
    `).all(channelId, start, end);
  },

  // --- Snapshots ---
  createSnapshotRun: (type: string) => {
    const db = getDb();
    const info = db.prepare('INSERT INTO snapshot_runs (created_at, type) VALUES (?, ?)').run(new Date().toISOString(), type);
    return info.lastInsertRowid as number;
  },

  saveSnapshotItems: (runId: number, items: any[]) => {
    const db = getDb();
    const stmt = db.prepare(`
      INSERT INTO snapshot_items (run_id, scope, entity_id, day, kind, payload_json)
      VALUES (@runId, @scope, @entity_id, @day, @kind, @payload_json)
    `);
    const transaction = db.transaction((rows) => {
      for (const row of rows) stmt.run({ ...row, runId });
    });
    transaction(items);
  },

  // --- Insights ---
  insertInsight: (insight: { run_id: number; type: string; title: string; description: string; evidence_json: string }) => {
    runUpsert(`
      INSERT INTO insights (run_id, type, title, description, evidence_json, created_at)
      VALUES (@run_id, @type, @title, @description, @evidence_json, ?)
    `, { ...insight, created_at: new Date().toISOString() } as unknown as Record<string, unknown>);
  },

  getLatestInsights: (limit = 10) => {
    const db = getDb();
    return db.prepare('SELECT * FROM insights ORDER BY created_at DESC LIMIT ?').all(limit);
  },

  // --- Coverage ---
  getCoverage: (channelId: string, start: string, end: string) => {
    const db = getDb();
    const existing = db.prepare(`
      SELECT day FROM fact_channel_day 
      WHERE channel_id = ? AND day >= ? AND day <= ?
    `).all(channelId, start, end).map((r: any) => r.day);

    const expected: string[] = [];
    let curr = new Date(start);
    const last = new Date(end);
    while (curr <= last) {
      expected.push(curr.toISOString().split('T')[0]);
      curr.setDate(curr.getDate() + 1);
    }

    const existingSet = new Set(existing);
    const missing = expected.filter(d => !existingSet.has(d));

    return {
      totalDays: expected.length,
      foundDays: existing.length,
      missingDays: missing,
      percentage: expected.length > 0 ? (existing.length / expected.length) * 100 : 0
    };
  },

  getAllVideos: () => {
    const db = getDb();
    return db.prepare('SELECT * FROM dim_video').all() as DbVideo[];
  },

  getVideoStats: (videoId: string, start: string, end: string) => {
    const db = getDb();
    return db.prepare(`
      SELECT * FROM fact_video_day 
      WHERE video_id = ? AND day >= ? AND day <= ?
      ORDER BY day ASC
    `).all(videoId, start, end) as DbVideoFact[];
  },

  // Optimized Batch Fetch for Nowcast/Sync (Fixes N+1)
  getAllVideoDailyViews: (start: string, end: string) => {
    const db = getDb();
    // Returns flat list: video_id, day, views
    // Ordered by video_id to make grouping easier
    return db.prepare(`
      SELECT video_id, day, views
      FROM fact_video_day
      WHERE day >= ? AND day <= ?
      ORDER BY video_id, day ASC
    `).all(start, end) as { video_id: string; day: string; views: number }[];
  },

  // --- Competitors ---
  addCompetitor: (channelId: string, title: string, profileId?: number) => {
    const db = getDb();
    db.prepare(`
      INSERT INTO competitor_channels (channel_id, title, added_at, profile_id)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(channel_id, profile_id) DO NOTHING
    `).run(channelId, title, new Date().toISOString(), profileId || 0);
  },

  getCompetitors: (profileId?: number) => {
    const db = getDb();
    if (profileId !== undefined) {
      return db.prepare('SELECT * FROM competitor_channels WHERE profile_id = ?').all(profileId) as any[];
    }
    return db.prepare('SELECT * FROM competitor_channels').all() as any[];
  },

  upsertCompetitorVideo: (video: DbCompetitorVideo) => {
    runUpsert(`
      INSERT INTO competitor_videos (video_id, channel_id, title, published_at)
      VALUES (@video_id, @channel_id, @title, @published_at)
      ON CONFLICT(video_id) DO UPDATE SET title = excluded.title
    `, video as unknown as Record<string, unknown>);
  },

  upsertCompetitorSnapshot: (snapshot: DbCompetitorSnapshot) => {
    runUpsert(`
      INSERT INTO competitor_video_day_snapshot (video_id, day, view_count)
      VALUES (@video_id, @day, @view_count)
      ON CONFLICT(video_id, day) DO UPDATE SET view_count = excluded.view_count
    `, snapshot as unknown as Record<string, unknown>);
  },

  upsertMomentum: (data: DbMomentum) => {
    runUpsert(`
      INSERT INTO competitor_video_momentum_day (video_id, day, velocity_24h, velocity_7d, momentum_score, is_hit)
      VALUES (@video_id, @day, @velocity_24h, @velocity_7d, @momentum_score, @is_hit)
      ON CONFLICT(video_id, day) DO UPDATE SET 
        velocity_24h = excluded.velocity_24h,
        velocity_7d = excluded.velocity_7d,
        momentum_score = excluded.momentum_score,
        is_hit = excluded.is_hit
    `, data as unknown as Record<string, unknown>);
  },

  getCompetitorVideoSnapshots: (videoId: string) => {
    const db = getDb();
    return db.prepare('SELECT * FROM competitor_video_day_snapshot WHERE video_id = ? ORDER BY day ASC').all(videoId);
  },

  getCompetitorHits: (days = 7) => {
    const db = getDb();
    const since = new Date();
    since.setDate(since.getDate() - days);
    const sinceStr = since.toISOString().split('T')[0];

    return db.prepare(`
      SELECT m.*, v.title, c.title as channel_title
      FROM competitor_video_momentum_day m
      JOIN competitor_videos v ON m.video_id = v.video_id
      JOIN competitor_channels c ON v.channel_id = c.channel_id
      WHERE m.is_hit = 1 AND m.day >= ?
      ORDER BY m.day DESC, m.velocity_24h DESC
    `).all(sinceStr);
  },

  // --- Topics ---
  clearTopicClusters: () => {
    const db = getDb();
    db.exec('DELETE FROM topic_cluster_membership');
    db.exec('DELETE FROM topic_clusters');
    db.exec('DELETE FROM topic_gap_scores');
    db.exec('DELETE FROM topic_pressure_day');
  },

  saveTopicCluster: (name: string, description?: string) => {
    const db = getDb();
    const info = db.prepare('INSERT INTO topic_clusters (name, created_at) VALUES (?, ?)').run(name, new Date().toISOString());
    return info.lastInsertRowid as number;
  },

  saveTopicMembership: (videoId: string, clusterId: number) => {
    const db = getDb();
    db.prepare('INSERT INTO topic_cluster_membership (video_id, cluster_id, distance) VALUES (?, ?, 0)').run(videoId, clusterId);
  },

  saveTopicGap: (clusterId: number, score: number, reason: string) => {
    const db = getDb();
    db.prepare('INSERT INTO topic_gap_scores (cluster_id, gap_score, reason, created_at) VALUES (?, ?, ?, ?)').run(clusterId, score, reason, new Date().toISOString());
  },

  saveTopicPressure: (clusterId: number, day: string, count: number, momentum: number) => {
    runUpsert(`
      INSERT INTO topic_pressure_day (cluster_id, day, publication_count, momentum_sum) 
      VALUES (?, ?, ?, ?)
      ON CONFLICT(cluster_id, day) DO UPDATE SET publication_count = excluded.publication_count, momentum_sum = excluded.momentum_sum
    `, { clusterId, day, count, momentum });
  },

  getAllVideoTitles: () => {
    const db = getDb();
    return db.prepare(`
      SELECT video_id, title, 'user' as type FROM dim_video
      UNION ALL
      SELECT video_id, title, 'competitor' as type FROM competitor_videos
    `).all();
  },

  getTopicClustersWithGaps: () => {
    const db = getDb();
    return db.prepare(`
      SELECT c.id, c.name, g.gap_score, g.reason
      FROM topic_clusters c
      LEFT JOIN topic_gap_scores g ON c.id = g.cluster_id
      ORDER BY g.gap_score DESC
    `).all();
  },

  // --- ML Models ---
  upsertModel: (model: DbModel) => {
    runUpsert(`
      INSERT INTO ml_models (model_id, type, version, trained_at, metrics_json, is_active)
      VALUES (@model_id, @type, @version, @trained_at, @metrics_json, @is_active)
      ON CONFLICT(model_id) DO UPDATE SET
        metrics_json = excluded.metrics_json,
        is_active = excluded.is_active,
        trained_at = excluded.trained_at
    `, model as unknown as Record<string, unknown>);
  },

  getActiveModel: (type: string) => {
    const db = getDb();
    return db.prepare('SELECT * FROM ml_models WHERE type = ? AND is_active = 1').get(type) as DbModel | undefined;
  },

  getAllModels: () => {
    const db = getDb();
    return db.prepare('SELECT * FROM ml_models ORDER BY trained_at DESC').all();
  },

  deactivateModelsByType: (type: string) => {
    const db = getDb();
    db.prepare('UPDATE ml_models SET is_active = 0 WHERE type = ?').run(type);
  },

  // --- Nowcast & Quality ---
  upsertGrowthCurve: (curve: DbGrowthCurve) => {
    runUpsert(`
      INSERT INTO video_growth_curves (cluster_id, duration_bucket, day_number, median_pct_of_day28, p25_pct_of_day28, p75_pct_of_day28)
      VALUES (@cluster_id, @duration_bucket, @day_number, @median_pct, @p25_pct, @p75_pct)
      ON CONFLICT(cluster_id, duration_bucket, day_number) DO UPDATE SET
        median_pct_of_day28 = excluded.median_pct_of_day28,
        p25_pct_of_day28 = excluded.p25_pct_of_day28,
        p75_pct_of_day28 = excluded.p75_pct_of_day28
    `, curve as unknown as Record<string, unknown>);
  },

  getGrowthCurve: (clusterId: number, durationBucket: string) => {
    const db = getDb();
    return db.prepare(`
      SELECT * FROM video_growth_curves 
      WHERE cluster_id = ? AND duration_bucket = ? 
      ORDER BY day_number ASC
    `).all(clusterId, durationBucket);
  },

  upsertQualityScore: (score: DbQualityScore) => {
    runUpsert(`
      INSERT INTO video_quality_scores (video_id, score, velocity_score, efficiency_score, conversion_score, explain_json, updated_at)
      VALUES (@video_id, @score, @velocity_score, @efficiency_score, @conversion_score, @explain_json, @updated_at)
      ON CONFLICT(video_id) DO UPDATE SET
        score = excluded.score,
        velocity_score = excluded.velocity_score,
        efficiency_score = excluded.efficiency_score,
        conversion_score = excluded.conversion_score,
        explain_json = excluded.explain_json,
        updated_at = excluded.updated_at
    `, { ...score, updated_at: new Date().toISOString() } as unknown as Record<string, unknown>);
  },

  getQualityScores: (limit = 20) => {
    const db = getDb();
    return db.prepare(`
      SELECT s.*, v.title 
      FROM video_quality_scores s
      JOIN dim_video v ON s.video_id = v.video_id
      ORDER BY s.score DESC
      LIMIT ?
    `).all(limit);
  },

  // --- Alerts ---
  insertAlert: (alert: DbAlert) => {
    const db = getDb();
    db.prepare(`
      INSERT INTO alerts (severity, message, entity_id, action_json, created_at, is_read)
      VALUES (@severity, @message, @entity_id, @action_json, ?, 0)
    `).run(alert, new Date().toISOString());
  },

  getUnreadAlerts: () => {
    const db = getDb();
    return db.prepare('SELECT * FROM alerts WHERE is_read = 0 ORDER BY created_at DESC').all();
  },

  markAlertRead: (id: number) => {
    const db = getDb();
    db.prepare('UPDATE alerts SET is_read = 1 WHERE id = ?').run(id);
  },

  // --- Transcripts & FTS ---
  saveTranscript: (videoId: string, content: string, format: string) => {
    const db = getDb();
    const plainText = parseSrtToText(content);
    
    const transaction = db.transaction(() => {
      db.prepare(`
        INSERT INTO video_transcripts (video_id, content, plain_text, format, updated_at)
        VALUES (@videoId, @content, @plainText, @format, ?)
        ON CONFLICT(video_id) DO UPDATE SET
          content = excluded.content,
          plain_text = excluded.plain_text,
          format = excluded.format,
          updated_at = excluded.updated_at
      `).run({ videoId, content, plainText, format }, new Date().toISOString());

      db.prepare(`
        UPDATE videos_fts SET content = @plainText WHERE video_id = @videoId
      `).run({ videoId, plainText });
    });
    transaction();
  },

  searchVideos: (query: string) => {
    const db = getDb();
    return db.prepare(`
      SELECT video_id, title, snippet(videos_fts, 2, '<b>', '</b>', '...', 10) as snippet
      FROM videos_fts 
      WHERE videos_fts MATCH ? 
      ORDER BY rank
      LIMIT 20
    `).all(query);
  },

  getTranscript: (videoId: string) => {
    const db = getDb();
    return db.prepare('SELECT * FROM video_transcripts WHERE video_id = ?').get(videoId) as { content: string } | undefined;
  },

  // --- Chapters & Retention ---
  saveChapters: (videoId: string, chapters: { startSeconds: number; title: string }[]) => {
    const db = getDb();
    const deleteStmt = db.prepare('DELETE FROM video_chapters WHERE video_id = ?');
    const insertStmt = db.prepare('INSERT INTO video_chapters (video_id, start_seconds, title) VALUES (?, ?, ?)');
    
    const transaction = db.transaction(() => {
      deleteStmt.run(videoId);
      for (const c of chapters) {
        insertStmt.run(videoId, c.startSeconds, c.title);
      }
    });
    transaction();
  },

  getChapters: (videoId: string) => {
    const db = getDb();
    return db.prepare('SELECT * FROM video_chapters WHERE video_id = ? ORDER BY start_seconds ASC').all(videoId);
  },

  saveRetention: (videoId: string, curve: any[], dropPoints: any[]) => {
    runUpsert(`
      INSERT INTO video_retention (video_id, curve_json, drop_points_json, updated_at)
      VALUES (@videoId, @curve, @drops, @updated_at)
      ON CONFLICT(video_id) DO UPDATE SET
        curve_json = excluded.curve_json,
        drop_points_json = excluded.drop_points_json,
        updated_at = excluded.updated_at
    `, { 
      videoId, 
      curve: JSON.stringify(curve), 
      drops: JSON.stringify(dropPoints),
      updated_at: new Date().toISOString()
    });
  },

  getRetention: (videoId: string) => {
    const db = getDb();
    return db.prepare('SELECT * FROM video_retention WHERE video_id = ?').get(videoId) as { curve_json: string; drop_points_json: string } | undefined;
  },

  // --- Imports ---
  logImport: (filename: string, status: string, rows: number) => {
    const db = getDb();
    db.prepare('INSERT INTO data_imports (filename, status, rows_processed, created_at) VALUES (?, ?, ?, ?)').run(filename, status, rows, new Date().toISOString());
  },

  // --- Lab & Backlog ---
  upsertVideoNote: (note: DbVideoNote) => {
    runUpsert(`
      INSERT INTO video_notes (video_id, tags, style_tags, notes)
      VALUES (@videoId, @tags, @styleTags, @notes)
      ON CONFLICT(video_id) DO UPDATE SET
        tags = excluded.tags,
        style_tags = excluded.style_tags,
        notes = excluded.notes
    `, {
      ...note,
      tags: JSON.stringify(note.tags),
      styleTags: JSON.stringify(note.styleTags)
    });
  },

  getVideoNotes: () => {
    const db = getDb();
    return db.prepare('SELECT * FROM video_notes').all();
  },

  upsertIdea: (idea: DbIdea) => {
    const db = getDb();
    if (idea.id) {
      db.prepare(`
        UPDATE ideas SET title = @title, description = @description, cluster_id = @clusterId, source = @source, effort = @effort, status = @status
        WHERE id = @id
      `).run(idea);
      return idea.id;
    } else {
      const info = db.prepare(`
        INSERT INTO ideas (title, description, cluster_id, source, effort, status, created_at)
        VALUES (@title, @description, @clusterId, @source, @effort, @status, ?)
      `).run(idea, new Date().toISOString());
      return info.lastInsertRowid as number;
    }
  },

  getIdeas: () => {
    const db = getDb();
    return db.prepare(`
      SELECT i.*, s.score, s.explain_json 
      FROM ideas i 
      LEFT JOIN idea_scores s ON i.id = s.idea_id
      ORDER BY i.created_at DESC
    `).all();
  },

  upsertIdeaScore: (score: DbIdeaScore) => {
    runUpsert(`
      INSERT INTO idea_scores (idea_id, score, explain_json, updated_at)
      VALUES (@ideaId, @score, @explainJson, @updated_at)
      ON CONFLICT(idea_id) DO UPDATE SET
        score = excluded.score,
        explain_json = excluded.explain_json,
        updated_at = excluded.updated_at
    `, { ...score, updated_at: new Date().toISOString() });
  },

  upsertContentPlan: (plan: DbContentPlan) => {
    const db = getDb();
    if (plan.id) {
      db.prepare(`
        UPDATE content_plan SET title = @title, target_date = @targetDate, cluster_id = @clusterId, status = @status
        WHERE id = @id
      `).run(plan);
      return plan.id;
    } else {
      const info = db.prepare(`
        INSERT INTO content_plan (title, target_date, cluster_id, status)
        VALUES (@title, @targetDate, @clusterId, @status)
      `).run(plan);
      return info.lastInsertRowid as number;
    }
  },

  getContentPlan: () => {
    const db = getDb();
    return db.prepare('SELECT * FROM content_plan ORDER BY target_date ASC').all();
  },

  logExport: (path: string, type: string) => {
    const db = getDb();
    db.prepare('INSERT INTO export_history (path, type, created_at) VALUES (?, ?, ?)').run(path, type, new Date().toISOString());
  },

  getExportHistory: () => {
    const db = getDb();
    return db.prepare('SELECT * FROM export_history ORDER BY created_at DESC LIMIT 10').all();
  },

  // Optimized: Use JOIN instead of correlated subquery (Fixes N+1)
  getVideoMetricsWithTags: (startDay: string) => {
    const db = getDb();
    return db.prepare(`
      SELECT v.video_id, v.title, n.tags, n.style_tags, SUM(f.views) as views_7d
      FROM dim_video v
      LEFT JOIN video_notes n ON v.video_id = n.video_id
      LEFT JOIN fact_video_day f ON v.video_id = f.video_id
      WHERE f.day >= ?
      GROUP BY v.video_id
    `).all(startDay);
  },

  // --- LLM Cache & Usage ---
  getLlmCache: (hash: string) => {
    const db = getDb();
    return db.prepare('SELECT response FROM llm_cache WHERE hash = ?').get(hash) as { response: string } | undefined;
  },

  setLlmCache: (hash: string, response: string) => {
    const db = getDb();
    db.prepare('INSERT INTO llm_cache (hash, response, created_at) VALUES (?, ?, ?)').run(hash, response, new Date().toISOString());
  },

  getLlmUsage: (day: string) => {
    const db = getDb();
    return db.prepare('SELECT * FROM llm_usage WHERE day = ?').get(day) as { tokens_used: number; cost_estimate: number } | undefined;
  },

  incrementLlmUsage: (day: string, tokens: number, cost: number) => {
    runUpsert(`
      INSERT INTO llm_usage (day, tokens_used, cost_estimate)
      VALUES (@day, @tokens, @cost)
      ON CONFLICT(day) DO UPDATE SET
        tokens_used = tokens_used + excluded.tokens_used,
        cost_estimate = cost_estimate + excluded.cost_estimate
    `, { day, tokens, cost });
  },

  getLlmSettings: (profileId?: number): DbLlmSettings => {
    const db = getDb();
    const normalizedProfileId = profileId && profileId > 0 ? profileId : 0;
    const row = db.prepare(`
      SELECT provider, model, temperature, max_output_tokens, updated_at
      FROM llm_settings
      WHERE profile_id = ?
    `).get(normalizedProfileId) as {
      provider?: string;
      model?: string;
      temperature?: number;
      max_output_tokens?: number;
      updated_at?: string;
    } | undefined;

    return {
      provider: row?.provider === 'openai' ? 'openai' : row?.provider === 'gemini' ? 'gemini' : DEFAULT_LLM_SETTINGS.provider,
      model: (row?.model || '').trim() || DEFAULT_LLM_SETTINGS.model,
      temperature: typeof row?.temperature === 'number' ? row.temperature : DEFAULT_LLM_SETTINGS.temperature,
      maxOutputTokens: typeof row?.max_output_tokens === 'number' ? row.max_output_tokens : DEFAULT_LLM_SETTINGS.maxOutputTokens,
      updatedAt: row?.updated_at,
    };
  },

  saveLlmSettings: (settings: Partial<DbLlmSettings>, profileId?: number): DbLlmSettings => {
    const db = getDb();
    const normalizedProfileId = profileId && profileId > 0 ? profileId : 0;
    const current = repo.getLlmSettings(normalizedProfileId);

    const provider = settings.provider === 'openai' || settings.provider === 'gemini'
      ? settings.provider
      : current.provider;
    const model = (settings.model || '').trim() || current.model;
    const temperature = typeof settings.temperature === 'number' && Number.isFinite(settings.temperature)
      ? settings.temperature
      : current.temperature;
    const maxOutputTokens = typeof settings.maxOutputTokens === 'number' && Number.isFinite(settings.maxOutputTokens)
      ? Math.max(1, Math.floor(settings.maxOutputTokens))
      : current.maxOutputTokens;
    const updatedAt = new Date().toISOString();

    db.prepare(`
      INSERT INTO llm_settings (profile_id, provider, model, temperature, max_output_tokens, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(profile_id) DO UPDATE SET
        provider = excluded.provider,
        model = excluded.model,
        temperature = excluded.temperature,
        max_output_tokens = excluded.max_output_tokens,
        updated_at = excluded.updated_at
    `).run(normalizedProfileId, provider, model, temperature, maxOutputTokens, updatedAt);

    return {
      provider,
      model,
      temperature,
      maxOutputTokens,
      updatedAt,
    };
  },

  // --- Maintenance ---
  maintenance: {
    vacuum: () => getDb().exec('VACUUM'),
    reindex: () => getDb().exec('REINDEX'),
    resetCache: () => getDb().exec('DELETE FROM llm_cache')
  },

  // --- Profiles ---
  createProfile: (name: string, channelId: string) => {
    const db = getDb();
    const info = db.prepare('INSERT INTO profiles (name, channel_id, is_active) VALUES (?, ?, 0)').run(name, channelId);
    return info.lastInsertRowid as number;
  },

  getProfiles: () => {
    const db = getDb();
    return db.prepare('SELECT * FROM profiles').all();
  },

  getActiveProfile: () => {
    const db = getDb();
    return db.prepare('SELECT * FROM profiles WHERE is_active = 1').get();
  },

  switchProfile: (id: number) => {
    const db = getDb();
    const transaction = db.transaction(() => {
      db.prepare('UPDATE profiles SET is_active = 0').run();
      db.prepare('UPDATE profiles SET is_active = 1 WHERE id = ?').run(id);
    });
    transaction();
  }
};
