# Deduplication Plan

## 1. Repository Layer (`packages/core/src/db/repo.ts`)
**Status:** Completed
**Changes:**
- Implemented `runUpsert` and `runBatchUpsert` helpers.
- Refactored ~15 upsert functions to use these helpers.
- Reduced boilerplate code significantly.

## 2. Type Definitions
**Status:** Completed
**Changes:**
- Deleted root `types.ts`.
- Moved all types to `@insight/shared`.
- Updated imports in `App.tsx` and components.

## 3. Shared Utilities (New)
**Status:** Completed
**Changes:**
- Created `packages/shared/src/utils/date.ts` for date logic (formatting, ranges).
- Created `packages/shared/src/utils/math.ts` for statistical logic (mean, stdDev, percentChange).
- Refactored `api`, `core`, `reports` to use these shared utilities.
- Removed duplicate logic from `RealProvider`, `FakeProvider`, `CoreDataExecutor`, `SyncOrchestrator`, `ReportService`, `AnomalyDetection`, and `HtmlGenerator`.

## 4. Parsers
**Status:** Completed
**Changes:**
- Moved `parseDuration` to `packages/core/src/utils/parsers.ts` (though currently kept private in RealProvider for simplicity as it's specific to YouTube API format, but `parseSrt` and `parseCsv` are centralized).

## Next Steps
- Monitor for new duplications in ML feature engineering.
- Consider moving `metrics.ts` from `core` entirely into `shared/utils/math` if it becomes purely mathematical.
