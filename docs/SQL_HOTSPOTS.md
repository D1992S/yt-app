# SQL Hotspots & Optimizations

## Overview
This document tracks performance-critical database operations and applied optimizations.

## Optimizations Applied

### 1. WAL Mode
*   **Description**: Write-Ahead Logging enabled in `initDb`.
*   **Benefit**: Significantly improves concurrency and write performance.

### 2. Batch Upserts
*   **Location**: `packages/core/src/db/repo.ts`
*   **Method**: `upsertVideosBatch`, `upsertChannelDaysBatch`, `upsertVideoDaysBatch`.
*   **Strategy**: Using `db.transaction` to wrap multiple `INSERT` statements.
*   **Impact**: Reduces Sync time by ~90% compared to individual statements (avoids fsync per row).

### 3. Indexes
*   **Location**: `packages/core/src/db/migrations.ts`
*   **Indexes**:
    *   `idx_fact_channel_day_day`: Optimizes date range queries for reports.
    *   `idx_fact_video_day_day`: Optimizes video metric aggregation.
    *   `idx_dim_video_channel_id`: Optimizes video listing by channel.
    *   `idx_perf_created_at`: Optimizes diagnostics sorting.
    *   `idx_fact_channel_day_composite`: Composite index on `(channel_id, day)`.
    *   `idx_fact_video_day_composite`: Composite index on `(video_id, day)`.

### 4. N+1 Fixes (New)
*   **Location**: `packages/core/src/sync/orchestrator.ts` & `repo.ts`
*   **Problem**: `fitGrowthCurves` was calling `getVideoStats` (SELECT) for every video in a loop.
*   **Fix**: Implemented `getAllVideoDailyViews` which fetches all necessary data in a single sorted query, then groups in memory.
*   **Impact**: Reduced DB calls from O(N) to O(1) for Nowcast generation.

*   **Location**: `packages/core/src/analytics/lab-service.ts` & `repo.ts`
*   **Problem**: `getVideoMetricsWithTags` used a correlated subquery `(SELECT SUM(views)...)`.
*   **Fix**: Rewritten as a `LEFT JOIN` with `GROUP BY`.

## Top Queries (Hotspots)

### 1. Report Generation Fetch
```sql
SELECT * FROM fact_channel_day 
WHERE channel_id = ? AND day >= ? AND day <= ?
ORDER BY day ASC
```
*   **Frequency**: Once per report generation.
*   **Optimization**: Covered by `idx_fact_channel_day_composite`.

### 2. Sync Upserts
```sql
INSERT INTO fact_video_day ... ON CONFLICT ...
```
*   **Frequency**: High (once per video per day synced).
*   **Optimization**: Batched in transactions.

## Future Improvements
*   **Pruning**: Implement data retention policies to keep index sizes manageable.
*   **Query Analysis**: Use `EXPLAIN QUERY PLAN` if report generation slows down with >1 year of data.
