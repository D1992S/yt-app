export type DateRangePreset = '7d' | '28d' | '90d' | '365d' | 'custom';
export type ReportMode = 'quick' | 'standard' | 'max';

export interface Range {
  dateFrom: Date;
  dateTo: Date;
  preset: DateRangePreset;
}

export type SyncStage = 'init' | 'fetching' | 'processing' | 'saving';
export type SyncStatus = 'idle' | 'active' | 'success' | 'error';

export interface VideoDTO {
  id: string;
  title: string;
  views: number;
  publishedAt: string;
  durationSec: number;
}

export interface ChannelDTO {
  id: string;
  title: string;
  subscriberCount: number;
  createdAt: string;
  uploadsPlaylistId?: string;
}

export interface MetricRow {
  date: string;
  value: number;
  metric: string;
}

export interface DataPoint {
  date: string;
  value: number;
  category: string;
}

export interface AppPaths {
  userData: string;
  db: string;
  logs: string;
  reports: string;
  exports: string;
  cache: string;
  fixtures: string;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  picture?: string;
}

export interface AppState {
  status: 'IDLE' | 'FETCHING' | 'CALCULATING' | 'ANALYZING' | 'DONE' | 'ERROR';
  currentRange: Range;
  currentMode: ReportMode;
  ipcStatus: string;
  paths?: AppPaths;
  user?: UserProfile;
  safeModeError?: SafeModeError;
}

export interface ApiConfig {
  paths: AppPaths;
  providerMode: 'fake' | 'real';
  recordFixtures: boolean;
  getAccessToken: () => Promise<string | null>;
}

export interface SearchResult {
  videoId: string;
  title: string;
  snippet: string;
  timestamp?: string; // HH:MM:SS
  matchType: 'title' | 'transcript' | 'note';
}

export interface VideoChapter {
  id?: number;
  videoId: string;
  startSeconds: number;
  title: string;
}

export interface RetentionPoint {
  seconds: number;
  pct: number; // 0-100
}

export interface CsvMapping {
  dateCol: string;
  metricCol: string;
  metricType: 'views' | 'watch_time' | 'revenue';
  videoIdCol?: string; // Optional, if file is per-video
}

export interface VideoNote {
  videoId: string;
  tags: string[];
  styleTags: string[];
  notes: string;
}

export interface Idea {
  id?: number;
  title: string;
  description: string;
  clusterId?: number;
  source: string;
  effort: number;
  status: 'backlog' | 'planned' | 'done';
  score?: number;
  explainJson?: string;
}

export interface ContentPlanItem {
  id?: number;
  title: string;
  targetDate: string;
  clusterId?: number;
  riskScore?: number;
  riskReason?: string;
}

export interface ExportRecord {
  id: number;
  path: string;
  type: string;
  createdAt: string;
}

// --- LLM Assistant Types ---

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  evidence?: {
    source: string;
    data: any;
  }[];
}

export interface QueryPlan {
  intent: 'analytics' | 'list_videos' | 'general_knowledge';
  metrics?: string[];
  dimension?: 'day' | 'video' | 'channel';
  filters?: {
    date_range?: string; // 'last_7d', 'last_28d', 'all'
    video_ids?: string[];
    min_views?: number;
  };
  limit?: number;
}

// --- Safe Mode ---

export interface SafeModeError {
  type: 'network' | 'auth' | 'quota' | 'db_locked' | 'unknown';
  message: string;
  details?: string;
  isRetryable?: boolean;
}

// --- Exports ---
export * from './utils/date';
export * from './utils/math';
export * from './schemas';
export * from './errors';
