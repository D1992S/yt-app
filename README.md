# InsightEngine Desktop

A local-first, deterministic reporting tool for YouTube Analytics.

## Features
- **Local Database**: SQLite storage for all metrics.
- **Offline Ready**: Works without internet after data sync.
- **Portable**: No installation required.
- **Privacy**: Tokens stored locally (encrypted).

## Development

### Prerequisites
- Node.js 18+
- pnpm

### Setup
```bash
pnpm install
```

### Running in Dev Mode (Hot Reload)
```bash
pnpm dev
```

### Testing
- `pnpm test:arch`: Check architecture boundaries.
- `pnpm test:db`: Test database connection and migrations.
- `pnpm test:sync`: Test sync engine with fake data.

## Modes

### Fake Mode (Default)
Uses JSON fixtures from `packages/api/fixtures`. No API keys required.
```bash
APP_PROVIDER=fake pnpm dev
```

### Real Mode
Connects to YouTube API. Requires Google Cloud Console setup.
```bash
APP_PROVIDER=real GOOGLE_CLIENT_ID=... GOOGLE_CLIENT_SECRET=... pnpm dev
```

### Record Mode
Proxies real requests and saves them as fixtures.
```bash
APP_PROVIDER=real RECORD_FIXTURES=1 pnpm dev
```

## Building Portable App
Creates a portable executable in `dist/`.
```bash
pnpm build:portable
```
