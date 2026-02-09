import { app } from 'electron';
import path from 'path';
import fs from 'fs';
import { AppPaths } from '@insight/shared';

let appPaths: AppPaths | null = null;
let logStream: fs.WriteStream | null = null;

export const initializePaths = (): AppPaths => {
  const userData = app.getPath('userData');
  
  const paths: AppPaths = {
    userData,
    db: path.join(userData, 'db'),
    logs: path.join(userData, 'logs'),
    reports: path.join(userData, 'reports'),
    exports: path.join(userData, 'exports'),
    cache: path.join(userData, 'cache'),
    fixtures: path.join(userData, 'fixtures'),
  };

  // Ensure directories exist
  Object.values(paths).forEach((dirPath) => {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  });

  appPaths = paths;
  return paths;
};

export const getAppPaths = (): AppPaths => {
  if (!appPaths) return initializePaths();
  return appPaths;
};

const rotateLogs = (logDir: string) => {
  const maxFiles = 5;
  const baseLog = path.join(logDir, 'app.log');

  try {
    // Remove the oldest if exists
    const oldest = path.join(logDir, `app.log.${maxFiles}`);
    if (fs.existsSync(oldest)) fs.unlinkSync(oldest);

    // Shift others
    for (let i = maxFiles - 1; i >= 1; i--) {
      const current = path.join(logDir, `app.log.${i}`);
      const next = path.join(logDir, `app.log.${i + 1}`);
      if (fs.existsSync(current)) {
        fs.renameSync(current, next);
      }
    }

    // Rename current to .1
    if (fs.existsSync(baseLog)) {
      fs.renameSync(baseLog, path.join(logDir, 'app.log.1'));
    }
  } catch (e) {
    console.error('Failed to rotate logs', e);
  }
};

export const initializeLogger = () => {
  const paths = getAppPaths();
  
  // Rotate on startup
  rotateLogs(paths.logs);

  const logFile = path.join(paths.logs, 'app.log');
  logStream = fs.createWriteStream(logFile, { flags: 'a' });

  log(`Logger initialized. Writing to ${logFile}`);
};

// Security: Redact sensitive information
const redact = (text: string): string => {
  let safeText = text;
  
  // Redact API Keys (generic pattern)
  safeText = safeText.replace(/AIza[0-9A-Za-z-_]{35}/g, '[REDACTED_API_KEY]');
  
  // Redact Bearer Tokens
  safeText = safeText.replace(/Bearer\s+[a-zA-Z0-9\-\._~+/]+=*/g, 'Bearer [REDACTED_TOKEN]');
  
  // Redact Emails
  safeText = safeText.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[REDACTED_EMAIL]');

  return safeText;
};

export const log = (message: string) => {
  if (!logStream) return;
  const timestamp = new Date().toISOString();
  const safeMessage = redact(message);
  const line = `[${timestamp}] ${safeMessage}\n`;
  
  logStream.write(line);
  // Also print to console for dev mode visibility
  console.log(line.trim());
};
