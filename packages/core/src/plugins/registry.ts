import { InsightPlugin, SyncContext } from './types';
import { 
  TopMoversPlugin, 
  BottleneckPlugin, 
  SourceShiftPlugin, 
  AnomalyDaysPlugin, 
  SleepersPlugin, 
  QualityRankingPlugin 
} from './standard-insights';
import { CtrDropPlugin, CompetitorGapHitPlugin } from './alert-plugins';
import { repo } from '../db/repo';

export class PluginManager {
  private plugins: InsightPlugin[] = [];

  constructor() {
    // Insights
    this.register(new TopMoversPlugin());
    this.register(new BottleneckPlugin());
    this.register(new SourceShiftPlugin());
    this.register(new AnomalyDaysPlugin());
    this.register(new SleepersPlugin());
    this.register(new QualityRankingPlugin());
    
    // Alerts
    this.register(new CtrDropPlugin());
    this.register(new CompetitorGapHitPlugin());
  }

  register(plugin: InsightPlugin) {
    this.plugins.push(plugin);
  }

  async runAll(context: SyncContext) {
    console.log(`[Plugins] Running ${this.plugins.length} plugins...`);
    for (const plugin of this.plugins) {
      try {
        const insights = await plugin.analyze(context);
        for (const insight of insights) {
          repo.insertInsight({
            run_id: context.runId,
            type: insight.type,
            title: insight.title,
            description: insight.description,
            evidence_json: JSON.stringify(insight.evidence)
          });
        }
      } catch (e) {
        console.error(`[Plugins] Error running ${plugin.name}:`, e);
      }
    }
  }
}

export const pluginManager = new PluginManager();
