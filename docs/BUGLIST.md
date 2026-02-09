# Bug List

## Blocker / Critical

| ID | Category | Description | Status | Fix |
|----|----------|-------------|--------|-----|
| QA-001 | DB | Cannot add same competitor to multiple profiles. | **Closed** | Migration 13. |
| QA-002 | UX/Logic | UI shows fake data even after Real Sync. | **Closed** | Added `analytics.getReportData` IPC. |
| QA-009 | Security | IPC payloads not validated. | **Closed** | Added Zod schemas. |
| QA-010 | Security | Logs might contain secrets. | **Closed** | Added redaction in `fs-utils.ts`. |

## Major

| ID | Category | Description | Status | Fix |
|----|----------|-------------|--------|-----|
| QA-003 | SQL | Slow report generation on large datasets. | **Closed** | Added composite indexes. |
| QA-004 | LLM | `list_videos` intent ignores `video_ids` filter. | **Closed** | Implemented filter logic. |

## Minor

| ID | Category | Description | Status | Fix |
|----|----------|-------------|--------|-----|
| QA-005 | Code | `repo.ts` duplication. | **Closed** | Refactored with helpers. |
| QA-006 | Types | Type mismatch. | **Closed** | Unified in `@insight/shared`. |
| QA-007 | Code | Implicit `any`. | **Closed** | Strict mode enabled. |
| QA-008 | Code | Duplicate types. | **Closed** | Deleted root `types.ts`. |
| QA-011 | UX | Raw error stack traces in UI. | **Closed** | Implemented `AppError` and Safe Mode UI. |
| QA-012 | Code | Dead code files. | **Closed** | Removed unused files and dependencies. |
