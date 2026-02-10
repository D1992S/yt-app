import { contextBridge, ipcRenderer } from 'electron';
import { Range, ReportMode } from '@insight/shared';

contextBridge.exposeInMainWorld('electron', {
  ping: () => ipcRenderer.invoke('ping'),
  getPaths: () => ipcRenderer.invoke('get-paths'),
  openFolder: (folderName: string) => ipcRenderer.invoke('open-folder', folderName),
  auth: {
    connect: () => ipcRenderer.invoke('auth:connect'),
    disconnect: () => ipcRenderer.invoke('auth:disconnect'),
    getStatus: () => ipcRenderer.invoke('auth:status'),
  },
  sync: {
    start: (range: Range) => ipcRenderer.invoke('sync:start', range),
    onProgress: (callback: (progress: any) => void) => {
      ipcRenderer.on('sync:progress', (_event, value) => callback(value));
      return () => ipcRenderer.removeAllListeners('sync:progress');
    }
  },
  report: {
    generate: (range: Range, mode: ReportMode) => ipcRenderer.invoke('report:generate', { range, mode })
  },
  analytics: {
    getReportData: (range: Range) => ipcRenderer.invoke('analytics:getReportData', range)
  },
  perf: {
    getStats: () => ipcRenderer.invoke('perf:stats')
  },
  ml: {
    train: () => ipcRenderer.invoke('ml:train'),
    getModels: () => ipcRenderer.invoke('ml:getModels')
  },
  search: {
    query: (q: string) => ipcRenderer.invoke('search:query', q)
  },
  video: {
    getDetails: (videoId: string) => ipcRenderer.invoke('video:getDetails', videoId)
  },
  transcript: {
    save: (data: any) => ipcRenderer.invoke('transcript:save', data)
  },
  import: {
    csv: (data: any) => ipcRenderer.invoke('import:csv', data)
  },
  lab: {
    analyze: () => ipcRenderer.invoke('lab:analyze')
  },
  backlog: {
    get: () => ipcRenderer.invoke('backlog:get'),
    add: (idea: any) => ipcRenderer.invoke('backlog:add', idea)
  },
  calendar: {
    get: () => ipcRenderer.invoke('calendar:get'),
    add: (plan: any) => ipcRenderer.invoke('calendar:add', plan)
  },
  export: {
    create: () => ipcRenderer.invoke('export:create'),
    history: () => ipcRenderer.invoke('export:history')
  },
  llm: {
    ask: (payload: string | { question: string; provider?: 'openai' | 'gemini'; model?: string; temperature?: number; maxOutputTokens?: number; profileId?: number }) => ipcRenderer.invoke('llm:ask', payload),
    generate: (payload: string | { question: string; provider?: 'openai' | 'gemini'; model?: string; temperature?: number; maxOutputTokens?: number; profileId?: number }) => ipcRenderer.invoke('llm:ask', payload),
    getSettings: (profileId?: number) => ipcRenderer.invoke('llm:settings:get', profileId),
    saveSettings: (payload: { provider?: 'openai' | 'gemini'; model?: string; temperature?: number; maxOutputTokens?: number; profileId?: number }) => ipcRenderer.invoke('llm:settings:save', payload)
  },
  recovery: {
    run: (action: string) => ipcRenderer.invoke('recovery:run', action)
  },
  profile: {
    create: (data: any) => ipcRenderer.invoke('profile:create', data),
    list: () => ipcRenderer.invoke('profile:list'),
    switch: (id: number) => ipcRenderer.invoke('profile:switch', id),
    active: () => ipcRenderer.invoke('profile:active')
  },
  db: {
    checkIntegrity: () => ipcRenderer.invoke('db:integrity')
  }
});
