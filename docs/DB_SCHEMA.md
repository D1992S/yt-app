# Database Schema Documentation

## Overview
The application uses SQLite with a Star Schema approach for core analytics, supplemented by extension tables for specific features (ML, Competitors, Topics).

## Core Analytics (Star Schema)

### Dimensions
*   **`dim_channel`**: Stores channel metadata.
    *   `channel_id` (PK, TEXT)
    *   `title` (TEXT)
    *   `created_at` (TEXT)
    *   `raw_json` (TEXT)
*   **`dim_video`**: Stores video metadata.
    *   `video_id` (PK, TEXT)
    *   `channel_id` (FK, TEXT)
    *   `title` (TEXT)
    *   `published_at` (TEXT)
    *   `duration_sec` (INTEGER)
    *   `raw_json` (TEXT)

### Facts
*   **`fact_channel_day`**: Daily metrics for channels.
    *   PK: `(channel_id, day)`
    *   Metrics: `views`, `watch_time_minutes`, `avg_view_duration_sec`, `impressions`, `ctr`, `subs_gained`, `subs_lost`
*   **`fact_video_day`**: Daily metrics for videos.
    *   PK: `(video_id, day)`
    *   Metrics: `views`, `watch_time_minutes`, `avg_view_duration_sec`, `impressions`, `ctr`, `likes`, `comments`

## Competitor Intelligence
*   **`competitor_channels`**: Tracked competitor channels.
    *   PK: `(channel_id, profile_id)`
*   **`competitor_videos`**: Videos belonging to competitors.
    *   PK: `video_id`
*   **`competitor_video_day_snapshot`**: Raw daily view counts for competitor videos.
    *   PK: `(video_id, day)`
*   **`competitor_video_momentum_day`**: Calculated velocity and momentum scores.
    *   PK: `(video_id, day)`

## Topics & ML
*   **`topic_clusters`**: Identified topic groups.
*   **`topic_cluster_membership`**: Mapping videos to clusters.
*   **`topic_gap_scores`**: Analysis of content gaps per cluster.
*   **`topic_pressure_day`**: Competitive pressure per cluster/day.
*   **`ml_models`**: Registry of trained models.
*   **`video_growth_curves`**: Nowcast growth baselines.
*   **`video_quality_scores`**: Calculated quality metrics per video.

## Operational & System
*   **`app_meta`**: Key-value store for system state.
*   **`sync_runs`**: History of synchronization jobs.
*   **`perf_events`**: Performance telemetry.
*   **`alerts`**: System generated alerts.
*   **`profiles`**: User profiles for multi-channel/multi-config support.
*   **`llm_cache`**: Caching for LLM responses.
*   **`llm_usage`**: Token usage tracking.

## Content Enrichment
*   **`video_transcripts`**: Raw and plain text transcripts.
*   **`videos_fts`**: Virtual table for Full-Text Search.
*   **`video_chapters`**: Video chapters/segments.
*   **`video_retention`**: Audience retention curves.
*   **`video_notes`**: User notes and tags.
*   **`thumbnail_assets`**: Local paths to thumbnails.

## Planning
*   **`ideas`**: Backlog of video ideas.
*   **`idea_scores`**: AI scoring for ideas.
*   **`content_plan`**: Calendar schedule.
