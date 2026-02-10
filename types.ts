export type DateRangePreset = '7d' | '28d' | '90d' | '365d' | 'custom';

export type ReportMode = 'FAST' | 'STANDARD' | 'MAX';

export interface DateRange {
  start: Date;
  end: Date;
  preset: DateRangePreset;
}

export interface ReportMetrics {
  total: number;
  average: number;
  min: number;
  max: number;
  trend: number;
  volatility: number;
}

export interface DataPoint {
  date: string;
  value: number;
  category: string;
}

export interface ReportData {
  id: string;
  generatedAt: string;
  range: DateRange;
  mode: ReportMode;
  metrics: ReportMetrics;
  timeSeries: DataPoint[];
  insights: string;
  isOffline: boolean;
}

export interface AppState {
  status: 'IDLE' | 'FETCHING' | 'CALCULATING' | 'ANALYZING' | 'DONE' | 'ERROR';
  currentRange: DateRange;
  currentMode: ReportMode;
  report: ReportData | null;
  error: string | null;
}
