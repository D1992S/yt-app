export interface Insight {
  type: string;
  title: string;
  description: string;
  evidence: any;
}

export interface SyncContext {
  runId: number;
  channelId: string;
  range: { start: string; end: string };
  repo: any; // Using any to avoid circular dependency with repo import, or define interface
}

export interface InsightPlugin {
  name: string;
  analyze(context: SyncContext): Promise<Insight[]>;
}
