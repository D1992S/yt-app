import { app, BrowserWindow, ipcMain, shell } from 'electron';
import path from 'path';
import os from 'os';
import { initializePaths, initializeLogger, log, getAppPaths } from './fs-utils';
import { initDb, closeDb, meta, TokenStore, SyncOrchestrator, perf, modelRegistry, repo, parseSrtToSegments, parseCsv, analyzeStyles, scoreIdea, checkRepetitionRisk, CoreDataExecutor, checkIntegrity } from '@insight/core';
import { initApi, getApi } from '@insight/api';
import { OpenAIProvider, GeminiProvider, LocalStubProvider, ProviderRegistry, LLMOrchestrator, generateInsights } from '@insight/llm';
import { resolveLlmConfig, respondInFakeMode } from './llm-runtime';
import { AuthManager } from './auth-flow';
import { generateReport } from './report-service';
import { createWeeklyPackage } from './export-service';
import { formatDateISO, DateRangeSchema, GenerateReportSchema, ProfileCreateSchema, TranscriptSaveSchema, ImportCsvSchema, SearchQuerySchema, AppError, calculateMetrics } from '@insight/shared';

// Disable GPU Acceleration for Windows 7
if (os.release().startsWith('6.1')) app.disableHardwareAcceleration();

// Set application name for Windows 10+ notifications
if (process.platform === 'win32') app.setAppUserModelId(app.getName());

if (!app.requestSingleInstanceLock()) {
  app.quit();
  process.exit(0);
}

let win: BrowserWindow | null = null;
let authManager: AuthManager | null = null;
let syncOrchestrator: SyncOrchestrator | null = null;
let llmOrchestrator: LLMOrchestrator | null = null;

type LlmRequestPayload = {
  question: string;
  provider?: 'openai' | 'gemini';
  model?: string;
  temperature?: number;
  maxOutputTokens?: number;
  profileId?: number;
};

const normalizeLlmRequest = (payload: unknown): LlmRequestPayload => {
  if (typeof payload === 'string') {
    return { question: payload };
  }

  if (!payload || typeof payload !== 'object') {
    throw new AppError('VALIDATION_ERROR', 'Invalid question payload');
  }

  const request = payload as Record<string, unknown>;
  if (typeof request.question !== 'string') {
    throw new AppError('VALIDATION_ERROR', 'Invalid question payload');
  }

  return {
    question: request.question,
    provider: request.provider === 'openai' || request.provider === 'gemini' ? request.provider : undefined,
    model: typeof request.model === 'string' ? request.model : undefined,
    temperature: typeof request.temperature === 'number' ? request.temperature : undefined,
    maxOutputTokens: typeof request.maxOutputTokens === 'number' ? request.maxOutputTokens : undefined,
    profileId: typeof request.profileId === 'number' ? request.profileId : undefined,
  };
};

async function createWindow() {
  win = new BrowserWindow({
    title: 'InsightEngine Desktop',
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 650,
    backgroundColor: '#09090b',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    await win.loadURL(process.env.VITE_DEV_SERVER_URL);
    win.webContents.openDevTools();
  } else {
    await win.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  win.once('ready-to-show', () => {
    win?.show();
  });
}

// Helper to wrap IPC handlers with standardized error handling
const handle = (channel: string, handler: (event: Electron.IpcMainInvokeEvent, ...args: any[]) => Promise<any>) => {
  ipcMain.handle(channel, async (event, ...args) => {
    try {
      return await handler(event, ...args);
    } catch (e) {
      const appError = AppError.from(e);
      log(`[IPC Error] ${channel}: ${appError.message} (${appError.code})`);
      // Electron serialization of custom errors is limited, so we throw a plain object or string that the renderer can parse
      // However, throwing an object often results in "Error: [object Object]" in renderer.
      // Best practice: throw a new Error with a JSON string of the AppError.
      throw new Error(JSON.stringify(appError.toJSON()));
    }
  });
};

app.whenReady().then(() => {
  try {
    const paths = initializePaths();
    initializeLogger();
    
    log('App starting...');
    log(`User Data Path: ${paths.userData}`);

    const dbPath = path.join(paths.db, 'insight.db');
    initDb({ path: dbPath });
    log('Database initialized');

    meta.set('last_startup', new Date().toISOString());

    const providerMode = (process.env.APP_PROVIDER as 'fake' | 'real') || 'fake';
    authManager = new AuthManager(paths.userData, providerMode === 'fake');

    const recordFixtures = process.env.RECORD_FIXTURES === '1';
    const tokenStore = new TokenStore(paths.userData);

    initApi({
      paths,
      providerMode,
      recordFixtures,
      getAccessToken: async () => {
        if (providerMode === 'fake') return 'fake_token';
        const tokens = tokenStore.getTokens();
        return tokens ? tokens.access_token : null;
      }
    });
    log(`API initialized (Mode: ${providerMode}, Record: ${recordFixtures})`);

    syncOrchestrator = new SyncOrchestrator(getApi(), (progress) => {
      if (win) {
        win.webContents.send('sync:progress', progress);
      }
    });

    const isFakeMode = providerMode === 'fake';
    const openAiKey = process.env.OPENAI_API_KEY;
    const geminiKey = process.env.GEMINI_API_KEY;
    const openAiProvider = !isFakeMode && openAiKey ? new OpenAIProvider(openAiKey) : null;
    const geminiProvider = !isFakeMode && geminiKey ? new GeminiProvider(geminiKey) : null;
    const fallbackProvider = new LocalStubProvider();
    const llmProviderName = isFakeMode ? 'openai' : (openAiKey ? 'openai' : 'gemini');
    const llmModel = isFakeMode
      ? 'local-stub'
      : openAiKey
        ? (process.env.OPENAI_MODEL || 'gpt-4o-mini')
        : (process.env.GEMINI_MODEL || 'gemini-2.5-flash');
    const dataExecutor = new CoreDataExecutor();
    llmOrchestrator = new LLMOrchestrator(
      new ProviderRegistry({
        openai: openAiProvider || fallbackProvider,
        gemini: geminiProvider || fallbackProvider,
      }),
      dataExecutor,
      {
        provider: llmProviderName,
        plannerModel: llmModel,
        summarizerModel: llmModel,
      }
    );
    log(`LLM initialized (Provider: ${isFakeMode ? 'Forced Local Stub (fake mode)' : openAiKey ? 'OpenAI' : geminiKey ? 'Gemini' : 'Local Stub'})`);

    createWindow();

    // --- IPC Handlers ---

    handle('ping', async () => {
      log('IPC Ping received');
      return 'pong from main process';
    });

    handle('get-paths', async () => getAppPaths());

    handle('open-folder', async (_event, folderName) => {
      const paths = getAppPaths();
      const targetPath = paths[folderName as keyof typeof paths];
      if (targetPath) {
        log(`Opening folder: ${targetPath}`);
        await shell.openPath(targetPath);
        return true;
      }
      return false;
    });

    handle('auth:connect', async () => await authManager?.connect());
    handle('auth:disconnect', async () => {
      await authManager?.disconnect();
      return true;
    });
    handle('auth:status', async () => await authManager?.getProfile());

    handle('sync:start', async (_event, range) => {
      log('Starting sync...');
      const validatedRange = DateRangeSchema.parse(range);
      await syncOrchestrator?.run(validatedRange);
      return true;
    });

    handle('report:generate', async (_event, payload) => {
      log('Generating report...');
      const { range, mode } = GenerateReportSchema.parse(payload);
      const pdfPath = await generateReport(range, mode);
      await shell.openPath(pdfPath);
      return pdfPath;
    });

    handle('analytics:getReportData', async (_event, range) => {
      const validatedRange = DateRangeSchema.parse(range);
      const db = require('@insight/core').getDb();
      const channel = db.prepare('SELECT channel_id FROM dim_channel LIMIT 1').get();
      if (!channel) return [];

      const startStr = formatDateISO(validatedRange.dateFrom);
      const endStr = formatDateISO(validatedRange.dateTo);
      
      const stats = repo.getChannelStats(channel.channel_id, startStr, endStr);
      return stats.map((s: any) => ({
        date: s.day,
        value: s.views,
        category: 'Views'
      }));
    });

    handle('analytics:calculateMetrics', async (_event, data) => {
      return calculateMetrics(data);
    });

    handle('analytics:generateInsights', async (_event, { metrics, range }) => {
      const validatedRange = DateRangeSchema.parse(range);
      return await generateInsights(metrics, validatedRange);
    });

    handle('perf:stats', async () => perf.getStats());

    handle('ml:train', async () => {
      const db = require('@insight/core').getDb();
      const channel = db.prepare('SELECT channel_id FROM dim_channel LIMIT 1').get();
      if (channel) {
        await modelRegistry.trainAndEvaluateForecast(channel.channel_id);
        return true;
      }
      return false;
    });

    handle('ml:getModels', async () => repo.getAllModels());

    handle('search:query', async (_event, query) => {
      const validatedQuery = SearchQuerySchema.parse(query);
      const results = repo.searchVideos(validatedQuery);
      return results.map((r: any) => {
        const transcript = repo.getTranscript(r.video_id);
        let timestamp = '00:00:00';
        if (transcript) {
          const segments = parseSrtToSegments(transcript.content);
          const cleanSnippet = r.snippet.replace(/<[^>]*>/g, '');
          const searchPhrase = cleanSnippet.split(' ').slice(0, 3).join(' ');
          const match = segments.find(s => s.text.includes(searchPhrase));
          if (match) {
            const h = Math.floor(match.start / 3600).toString().padStart(2, '0');
            const m = Math.floor((match.start % 3600) / 60).toString().padStart(2, '0');
            const s = Math.floor(match.start % 60).toString().padStart(2, '0');
            timestamp = `${h}:${m}:${s}`;
          }
        }
        return { ...r, timestamp, matchType: 'transcript' };
      });
    });

    handle('transcript:save', async (_event, payload) => {
      const { videoId, content, format } = TranscriptSaveSchema.parse(payload);
      repo.saveTranscript(videoId, content, format);
      return true;
    });

    handle('video:getDetails', async (_event, videoId) => {
      if (typeof videoId !== 'string' || !videoId) return null;
      const chapters = repo.getChapters(videoId);
      const retention = repo.getRetention(videoId);
      return {
        chapters,
        retention: retention ? {
          curve: JSON.parse(retention.curve_json),
          drops: JSON.parse(retention.drop_points_json)
        } : null
      };
    });

    handle('import:csv', async (_event, payload) => {
      const { content, mapping } = ImportCsvSchema.parse(payload);
      const rows = parseCsv(content);
      const dataRows = rows.slice(1);
      const facts: any[] = [];
      let processed = 0;

      for (const row of dataRows) {
        if (row.length < 2) continue;
        const date = row[Number(mapping.dateCol)];
        const videoId = row[Number(mapping.videoIdCol)];
        const views = parseInt(row[Number(mapping.metricCol)] || '0');

        if (date && videoId) {
          facts.push({
            video_id: videoId,
            day: date,
            views,
            watch_time_minutes: 0, avg_view_duration_sec: 0, impressions: 0, ctr: 0, likes: 0, comments: 0
          });
          processed++;
        }
      }

      if (facts.length > 0) {
        repo.upsertVideoDaysBatch(facts);
      }
      
      repo.logImport('manual_upload.csv', 'success', processed);
      return processed;
    });

    handle('lab:analyze', async () => analyzeStyles());
    handle('backlog:get', async () => repo.getIdeas());
    handle('backlog:add', async (_event, idea) => {
      if (!idea || !idea.title) throw new AppError('VALIDATION_ERROR', "Invalid idea");
      const id = repo.upsertIdea(idea);
      const score = scoreIdea(idea);
      repo.upsertIdeaScore({ ideaId: id, score: score.score, explainJson: JSON.stringify(score.explanation) });
      return id;
    });
    handle('calendar:get', async () => repo.getContentPlan());
    handle('calendar:add', async (_event, plan) => {
      if (!plan || !plan.title) throw new AppError('VALIDATION_ERROR', "Invalid plan");
      const risk = checkRepetitionRisk(plan.title);
      const id = repo.upsertContentPlan(plan);
      return { id, ...risk };
    });
    handle('export:create', async () => {
      const path = await createWeeklyPackage();
      await shell.openPath(path);
      return path;
    });
    handle('export:history', async () => repo.getExportHistory());

    handle('llm:settings:get', async (_event, profileId) => {
      const normalizedProfileId = typeof profileId === 'number' ? profileId : undefined;
      return repo.getLlmSettings(normalizedProfileId);
    });

    handle('llm:settings:save', async (_event, payload) => {
      if (!payload || typeof payload !== 'object') throw new AppError('VALIDATION_ERROR', 'Invalid settings payload');
      const request = payload as Record<string, unknown>;
      const settings = {
        provider: request.provider === 'openai' || request.provider === 'gemini' ? request.provider : undefined,
        model: typeof request.model === 'string' ? request.model : undefined,
        temperature: typeof request.temperature === 'number' ? request.temperature : undefined,
        maxOutputTokens: typeof request.maxOutputTokens === 'number' ? request.maxOutputTokens : undefined,
      };
      const profileId = typeof request.profileId === 'number' ? request.profileId : undefined;
      return repo.saveLlmSettings(settings, profileId);
    });

    handle('llm:ask', async (_event, payload) => {
      if (!llmOrchestrator) throw new AppError('UNKNOWN_ERROR', 'LLM not initialized');
      const request = normalizeLlmRequest(payload);
      if (!request.question || request.question.length > 500) throw new AppError('VALIDATION_ERROR', "Invalid question");

      if (providerMode === 'fake') {
        return respondInFakeMode(request.question);
      }

      const savedSettings = repo.getLlmSettings(request.profileId);
      const runtimeConfig = resolveLlmConfig({
        providerMode,
        request,
        savedSettings,
        hasOpenAiKey: Boolean(openAiKey),
        hasGeminiKey: Boolean(geminiKey),
      });

      const runtimeOrchestrator = new LLMOrchestrator(
        new ProviderRegistry({
          openai: openAiProvider || fallbackProvider,
          gemini: geminiProvider || fallbackProvider,
        }),
        new CoreDataExecutor(),
        runtimeConfig
      );

      return await runtimeOrchestrator.processMessage(request.question);
    });

    handle('recovery:run', async (_event, action) => {
      log(`Running recovery action: ${action}`);
      if (action === 'vacuum') repo.maintenance.vacuum();
      if (action === 'reindex') repo.maintenance.reindex();
      if (action === 'reset_cache') repo.maintenance.resetCache();
      return true;
    });

    handle('profile:create', async (_event, payload) => {
      const { name, channelId } = ProfileCreateSchema.parse(payload);
      return repo.createProfile(name, channelId);
    });
    handle('profile:list', async () => repo.getProfiles());
    handle('profile:switch', async (_event, id) => {
      if (typeof id !== 'number') throw new AppError('VALIDATION_ERROR', "Invalid ID");
      repo.switchProfile(id);
      return true;
    });
    handle('profile:active', async () => repo.getActiveProfile());

    handle('db:integrity', async () => checkIntegrity());

  } catch (e) {
    console.error('Fatal error during startup:', e);
    log(`Fatal error: ${(e as Error).message}`);
  }
});

app.on('window-all-closed', () => {
  log('Window closed, quitting app.');
  closeDb();
  win = null;
  if (process.platform !== 'darwin') app.quit();
});

app.on('second-instance', () => {
  if (win) {
    if (win.isMinimized()) win.restore();
    win.focus();
  }
});
