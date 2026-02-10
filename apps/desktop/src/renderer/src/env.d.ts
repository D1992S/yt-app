/// <reference types="vite/client" />
import { AppPaths, UserProfile, Range, ReportMode, SearchResult, Idea, ContentPlanItem, ExportRecord, ChatMessage, DataPoint } from '@insight/shared';

declare global {
  interface Window {
    electron: {
      ping: () => Promise<string>;
      getPaths: () => Promise<AppPaths>;
      openFolder: (folderName: keyof AppPaths) => Promise<boolean>;
      auth: {
        connect: () => Promise<UserProfile>;
        disconnect: () => Promise<boolean>;
        getStatus: () => Promise<UserProfile | null>;
      };
      sync: {
        start: (range: Range) => Promise<boolean>;
        onProgress: (callback: (progress: any) => void) => () => void;
      };
      report: {
        generate: (range: Range, mode: ReportMode) => Promise<string>;
      };
      analytics: {
        getReportData: (range: Range) => Promise<DataPoint[]>;
      };
      perf: {
        getStats: () => Promise<any[]>;
      };
      ml: {
        train: () => Promise<boolean>;
        getModels: () => Promise<any[]>;
      };
      search: {
        query: (q: string) => Promise<SearchResult[]>;
      };
      video: {
        getDetails: (videoId: string) => Promise<any>;
      };
      transcript: {
        save: (data: { videoId: string; content: string; format: string }) => Promise<boolean>;
      };
      import: {
        csv: (data: { content: string; mapping: any }) => Promise<number>;
      };
      lab: {
        analyze: () => Promise<any[]>;
      };
      backlog: {
        get: () => Promise<Idea[]>;
        add: (idea: Idea) => Promise<number>;
      };
      calendar: {
        get: () => Promise<ContentPlanItem[]>;
        add: (plan: ContentPlanItem) => Promise<any>;
      };
      export: {
        create: () => Promise<string>;
        history: () => Promise<ExportRecord[]>;
      };
      llm: {
        ask: (payload: string | { question: string; provider?: 'openai' | 'gemini'; model?: string; temperature?: number; maxOutputTokens?: number; profileId?: number }) => Promise<ChatMessage>;
        getSettings: (profileId?: number) => Promise<{ provider: 'openai' | 'gemini'; model: string; temperature: number; maxOutputTokens: number; updatedAt?: string }>;
        saveSettings: (payload: { provider?: 'openai' | 'gemini'; model?: string; temperature?: number; maxOutputTokens?: number; profileId?: number }) => Promise<{ provider: 'openai' | 'gemini'; model: string; temperature: number; maxOutputTokens: number; updatedAt?: string }>;
      };
      recovery: {
        run: (action: 'vacuum' | 'reindex' | 'reset_cache') => Promise<boolean>;
      };
      profile: {
        create: (data: { name: string; channelId: string }) => Promise<number>;
        list: () => Promise<any[]>;
        switch: (id: number) => Promise<boolean>;
        active: () => Promise<any>;
      };
      db: {
        checkIntegrity: () => Promise<string[]>;
      };
    };
  }
}
