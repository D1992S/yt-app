import { repo } from '../db/repo';
import { 
  forecastNaive, 
  forecastSeasonalNaive, 
  forecastV2, 
  runBacktest, 
  TimeSeriesPoint 
} from '@insight/ml';

export class ModelRegistry {
  
  async trainAndEvaluateForecast(channelId: string) {
    console.log('[ML] Starting Forecast Training & Evaluation...');
    
    // 1. Fetch Data
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 365);
    
    const stats = repo.getChannelStats(channelId, start.toISOString().split('T')[0], end.toISOString().split('T')[0]);
    const data: TimeSeriesPoint[] = stats.map((s: any) => ({ date: s.day, value: s.views }));

    if (data.length < 60) {
      console.log('[ML] Not enough data for backtesting (min 60 days).');
      return;
    }

    // 2. Define Candidates
    const candidates = [
      { name: 'Naive', fn: forecastNaive },
      { name: 'SeasonalNaive', fn: forecastSeasonalNaive },
      { name: 'ForecastV2', fn: forecastV2 }
    ];

    // 3. Run Backtests
    const results = candidates.map(c => {
      const res = runBacktest(data, c.fn);
      return { ...res, type: 'forecast' };
    });

    // 4. Compare and Promote (Quality Gate)
    // Baseline is SeasonalNaive
    const baseline = results.find(r => r.modelName === 'SeasonalNaive');
    const baselineScore = baseline ? baseline.smape : Infinity;
    
    // Find best model
    const best = results.reduce((prev, curr) => (curr.smape < prev.smape ? curr : prev));

    console.log('[ML] Backtest Results:');
    results.forEach(r => console.log(` - ${r.modelName}: ${r.smape.toFixed(2)}% sMAPE`));

    // 5. Save to Registry
    // Deactivate old models of this type first if we are activating a new one? 
    // No, repo.getActiveModel handles selection, but we should ensure only one is active per type ideally, 
    // or repo.getActiveModel selects the latest active.
    // Here we update the `is_active` flag based on the gate.

    // Gate: Must be better or equal to baseline to be active.
    // If ForecastV2 is worse than SeasonalNaive, SeasonalNaive stays active.
    
    repo.deactivateModelsByType('forecast'); // Reset active state

    results.forEach(r => {
      // A model is active if it is the BEST found AND it passes the baseline check
      const isWinner = r.modelName === best.modelName;
      const passesGate = r.smape <= baselineScore;
      
      // Fallback: If best model fails gate (e.g. V2 is worse than Naive, but Naive is worse than Seasonal),
      // we default to SeasonalNaive as the safe choice if available.
      // Actually, if 'best' fails gate, it means 'best' IS the baseline (or baseline is better).
      // So 'isWinner' covers it, unless baseline itself is terrible, but it's a baseline.
      
      const isActive = isWinner && passesGate;

      repo.upsertModel({
        model_id: `forecast_${r.modelName.toLowerCase()}`,
        type: 'forecast',
        version: '1.0',
        trained_at: new Date().toISOString(),
        metrics_json: JSON.stringify({ smape: r.smape, mae: r.mae, residuals_count: r.residuals.length }),
        is_active: isActive ? 1 : 0
      });
      
      if (isActive) {
        console.log(`[ML] Promoted ${r.modelName} to ACTIVE (sMAPE: ${r.smape.toFixed(2)}%)`);
      }
    });
  }

  async getActiveForecastModel() {
    const model = repo.getActiveModel('forecast');
    if (!model) return 'SeasonalNaive'; // Default fallback
    const name = model.model_id.replace('forecast_', '');
    if (name === 'forecastv2') return 'ForecastV2';
    if (name === 'seasonalnaive') return 'SeasonalNaive';
    return 'Naive';
  }
}

export const modelRegistry = new ModelRegistry();
