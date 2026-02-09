# Release Checklist

## Pre-Release
1. **Database Backup**:
   - Ensure `vacuum` has been run via Recovery Mode.
   - Copy `insight.db` from User Data folder to a safe location.

2. **Migration Check**:
   - Run `pnpm test:db` to verify all migrations apply correctly on a fresh DB.
   - Verify `profiles` table exists.

3. **Smoke Test**:
   - Run `pnpm test:sync` to ensure core logic works.
   - Verify `pnpm test:ml` passes for feature engineering.

4. **Performance Budget**:
   - Run `node scripts/smoke-test.js` and ensure report generation is under 2s.

## Build
1. **Clean Build**:
   - Run `pnpm install` to ensure fresh dependencies.
   - Run `pnpm build:portable` to generate the portable executable.
   - Run `pnpm build` inside `apps/desktop` to generate the installer (`setup.exe`).

## Verification (Clean PC)
1. **Portable Mode**:
   - Copy the portable folder to a USB drive or new location.
   - Run the executable.
   - Verify app opens and "Fake Mode" works if no API key is present.

2. **Installer**:
   - Run `InsightEngine Setup.exe`.
   - Verify installation path selection works.
   - Launch app after install.
   - Check if `AppData` folder is created correctly.

## Post-Release
1. **Tagging**:
   - Git tag the release version (e.g., `v0.1.0`).
2. **Changelog**:
   - Update `CHANGELOG.md` with new features (Profiles, Safe Mode, LLM).
