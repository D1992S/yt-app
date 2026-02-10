import React, { useState, useCallback } from 'react';
import { AppState, ReportData, DateRange } from './types';
import { DEFAULT_RANGE, DEFAULT_MODE } from './constants';
import { DateSelector } from './components/DateSelector';
import { ReportConfig } from './components/ReportConfig';
import { ReportView } from './components/ReportView';
import { Loader2, Play } from 'lucide-react';

// Mocking fetchFakeData locally since the file was removed/refactored
const fetchFakeData = async (range: DateRange) => {
  await new Promise(resolve => setTimeout(resolve, 500));
  const days = Math.ceil((range.end.getTime() - range.start.getTime()) / (1000 * 60 * 60 * 24));
  return Array.from({ length: days }).map((_, i) => {
    const d = new Date(range.start);
    d.setDate(d.getDate() + i);
    return {
      date: d.toISOString().split('T')[0],
      value: Math.floor(Math.random() * 1000),
      category: 'Views'
    };
  });
};

// Metrics calculation with real trend & volatility
const calculateMetrics = (data: any[]) => {
  const values = data.map(d => d.value);
  const n = values.length;
  const total = values.reduce((a, b) => a + b, 0);
  const average = n > 0 ? total / n : 0;

  // Trend: linear regression slope over last 14 days (or all data), as % change
  const recentN = Math.min(n, 14);
  const recent = values.slice(-recentN);
  let trend = 0;
  if (recentN >= 2) {
    const x = Array.from({ length: recentN }, (_, i) => i);
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = recent.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((a, i) => a + i * recent[i], 0);
    const sumXX = x.reduce((a, i) => a + i * i, 0);
    const slope = (recentN * sumXY - sumX * sumY) / (recentN * sumXX - sumX * sumX);
    const meanRecent = sumY / recentN;
    trend = meanRecent > 0 ? (slope * recentN / meanRecent) * 100 : 0;
  }

  // Volatility: coefficient of variation (stdDev / mean * 100)
  let volatility = 0;
  if (n >= 2 && average > 0) {
    const variance = values.reduce((sum, v) => sum + Math.pow(v - average, 2), 0) / n;
    volatility = (Math.sqrt(variance) / average) * 100;
  }

  return {
    total,
    average,
    min: Math.min(...values),
    max: Math.max(...values),
    trend: Math.round(trend * 10) / 10,
    volatility: Math.round(volatility * 10) / 10,
  };
};

const generateInsights = async () => "Insights are not available in this preview mode.";

const App: React.FC = () => {
  const [state, setState] = useState<AppState>({
    status: 'IDLE',
    currentRange: DEFAULT_RANGE,
    currentMode: DEFAULT_MODE,
    report: null,
    error: null,
  });

  const handleGenerateReport = useCallback(async () => {
    setState((prev) => ({ ...prev, status: 'FETCHING', error: null }));

    try {
      const data = await fetchFakeData(state.currentRange);
      
      setState((prev) => ({ ...prev, status: 'CALCULATING' }));
      
      await new Promise(r => setTimeout(r, 200)); 
      const metrics = calculateMetrics(data);

      let insights = '';
      
      if (state.currentMode !== 'quick') {
        setState((prev) => ({ ...prev, status: 'ANALYZING' }));
        insights = await generateInsights();
      }

      const report: ReportData = {
        id: crypto.randomUUID().slice(0, 8).toUpperCase(),
        generatedAt: new Date().toISOString(),
        range: state.currentRange,
        mode: state.currentMode,
        metrics,
        timeSeries: data,
        insights,
        isOffline: true,
      };

      setState((prev) => ({
        ...prev,
        status: 'DONE',
        report,
      }));

    } catch (err) {
      setState((prev) => ({
        ...prev,
        status: 'ERROR',
        error: (err as Error).message,
      }));
    }
  }, [state.currentRange, state.currentMode]);

  const isProcessing = ['FETCHING', 'CALCULATING', 'ANALYZING'].includes(state.status);

  const statusMessage = isProcessing
    ? state.status === 'FETCHING' ? 'Pobieranie danych...'
      : state.status === 'CALCULATING' ? 'Obliczanie metryk...'
      : 'Generowanie analizy AI...'
    : '';

  return (
    <main className="min-h-screen bg-slate-100 p-4 md:p-8 font-sans text-slate-900" role="main">
      <div className="max-w-5xl mx-auto space-y-6">
        <header className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">InsightEngine</h1>
            <p className="text-slate-500">Desktop Analytics & Reporting Tool (Preview)</p>
          </div>
        </header>

        <section aria-label="Konfiguracja raportu" className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 space-y-4">
            <DateSelector
              value={state.currentRange}
              onChange={(r) => setState(s => ({ ...s, currentRange: r }))}
              disabled={isProcessing}
            />
            <ReportConfig
              mode={state.currentMode}
              onChange={(m) => setState(s => ({ ...s, currentMode: m }))}
              disabled={isProcessing}
            />
          </div>

          <div className="lg:col-span-4 flex flex-col justify-end">
            <button
              onClick={handleGenerateReport}
              disabled={isProcessing}
              aria-label={isProcessing ? statusMessage : 'Generuj raport analityczny'}
              aria-busy={isProcessing}
              className={`
                w-full h-full min-h-[120px] rounded-xl shadow-lg flex flex-col items-center justify-center gap-3
                transition-all duration-200 transform active:scale-[0.98]
                ${isProcessing
                  ? 'bg-slate-800 cursor-wait opacity-90'
                  : 'bg-blue-600 hover:bg-blue-700 hover:shadow-blue-200/50'
                }
              `}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="animate-spin text-white" size={32} aria-hidden="true" />
                  <span className="text-white font-medium animate-pulse" aria-live="polite">
                    {statusMessage}
                  </span>
                </>
              ) : (
                <>
                  <Play className="text-white fill-white" size={32} aria-hidden="true" />
                  <div className="text-center">
                    <span className="block text-xl font-bold text-white">Pobierz dane + Zrób raport</span>
                    <span className="text-blue-200 text-sm">Generuj HTML + PDF</span>
                  </div>
                </>
              )}
            </button>
          </div>
        </section>

        {state.status === 'ERROR' && (
          <div
            className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700"
            role="alert"
            aria-live="assertive"
          >
            <strong>Błąd:</strong> {state.error}
          </div>
        )}

        {state.report && state.status === 'DONE' && (
          <section className="mt-8" aria-label="Wyniki raportu">
            <ReportView data={state.report} />
          </section>
        )}
      </div>
    </main>
  );
};

export default App;
