import React, { useMemo } from 'react';
import { ReportData } from '../types';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Download, Printer } from 'lucide-react';

const MODE_LABELS: Record<string, string> = {
  quick: 'Szybki',
  standard: 'Standard',
  max: 'MAX',
};

function sanitizeHtml(html: string): string {
  const div = document.createElement('div');
  div.innerHTML = html;
  div.querySelectorAll('script,iframe,object,embed,form,link,style').forEach(el => el.remove());
  div.querySelectorAll('*').forEach(el => {
    for (const attr of Array.from(el.attributes)) {
      if (attr.name.startsWith('on') || attr.value.trim().toLowerCase().startsWith('javascript:')) {
        el.removeAttribute(attr.name);
      }
    }
  });
  return div.innerHTML;
}

interface ReportViewProps {
  data: ReportData;
}

export const ReportView: React.FC<ReportViewProps> = ({ data }) => {
  const { metrics, timeSeries, insights, mode } = data;
  const safeInsights = useMemo(() => sanitizeHtml(insights || 'Oczekiwanie na analizę...'), [insights]);

  return (
    <article
      className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500"
      aria-label={`Raport analityczny ${data.id}`}
    >
      {/* Header */}
      <header className="bg-slate-50 p-6 border-b border-slate-200 flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Raport Analityczny</h2>
          <p className="text-sm text-slate-500 mt-1">
            ID: <span className="font-mono">{data.id}</span>{' '}
            <span aria-hidden="true">&bull;</span>{' '}
            <time dateTime={data.generatedAt}>{new Date(data.generatedAt).toLocaleString()}</time>
          </p>
          <div className="mt-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            Tryb: {MODE_LABELS[mode] || mode}
          </div>
        </div>
        <div className="flex gap-2" role="toolbar" aria-label="Akcje raportu">
          <button
            className="p-2 text-slate-600 hover:bg-white hover:shadow-sm rounded-md border border-transparent hover:border-slate-200 transition-all"
            aria-label="Drukuj raport jako PDF"
            title="Drukuj / PDF"
          >
            <Printer size={20} aria-hidden="true" />
          </button>
          <button
            className="p-2 text-slate-600 hover:bg-white hover:shadow-sm rounded-md border border-transparent hover:border-slate-200 transition-all"
            aria-label="Pobierz raport jako JSON"
            title="Pobierz JSON"
          >
            <Download size={20} aria-hidden="true" />
          </button>
        </div>
      </header>

      <div className="p-6 space-y-8">
        {/* Key Metrics Grid */}
        <section aria-label="Kluczowe metryki">
          <h3 className="sr-only">Kluczowe metryki</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4" role="list">
            <div className="p-4 bg-slate-50 rounded-lg border border-slate-100" role="listitem">
              <p className="text-xs text-slate-500 uppercase font-semibold" id="metric-total">Suma Całkowita</p>
              <p className="text-2xl font-bold text-slate-900 mt-1" aria-labelledby="metric-total">
                {metrics.total.toLocaleString()}
              </p>
            </div>
            <div className="p-4 bg-slate-50 rounded-lg border border-slate-100" role="listitem">
              <p className="text-xs text-slate-500 uppercase font-semibold" id="metric-avg">Średnia Dzienna</p>
              <p className="text-2xl font-bold text-slate-900 mt-1" aria-labelledby="metric-avg">
                {metrics.average.toFixed(1)}
              </p>
            </div>
            <div className="p-4 bg-slate-50 rounded-lg border border-slate-100" role="listitem">
              <p className="text-xs text-slate-500 uppercase font-semibold" id="metric-trend">Trend</p>
              <p
                className={`text-2xl font-bold mt-1 ${metrics.trend >= 0 ? 'text-green-600' : 'text-red-600'}`}
                aria-labelledby="metric-trend"
                aria-label={`Trend: ${metrics.trend > 0 ? 'wzrost' : metrics.trend < 0 ? 'spadek' : 'bez zmian'} ${metrics.trend.toFixed(1)} procent`}
              >
                {metrics.trend > 0 ? '+' : ''}{metrics.trend.toFixed(1)}%
              </p>
            </div>
            <div className="p-4 bg-slate-50 rounded-lg border border-slate-100" role="listitem">
              <p className="text-xs text-slate-500 uppercase font-semibold" id="metric-vol">Zmienność</p>
              <p className="text-2xl font-bold text-slate-900 mt-1" aria-labelledby="metric-vol">
                {metrics.volatility.toFixed(1)}
              </p>
            </div>
          </div>
        </section>

        {/* Chart */}
        <section aria-label="Wykres danych w czasie">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">Przebieg w czasie</h3>
          <div className="h-[300px] w-full" role="img" aria-label={`Wykres obszarowy przedstawiający ${timeSeries.length} punktów danych`}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={timeSeries}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis
                  dataKey="date"
                  tick={{fontSize: 12, fill: '#64748b'}}
                  tickLine={false}
                  axisLine={false}
                  minTickGap={30}
                />
                <YAxis
                  tick={{fontSize: 12, fill: '#64748b'}}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#2563eb"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorValue)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* AI Insights Section */}
        {mode !== 'quick' && (
          <section className="border-t border-slate-200 pt-6" aria-label="Interpretacja AI">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" aria-hidden="true"></div>
              <h3 className="text-sm font-semibold text-slate-700">Interpretacja AI (Evidence Mode)</h3>
            </div>
            <div
              className="prose prose-sm prose-slate max-w-none bg-purple-50 p-4 rounded-lg border border-purple-100 text-slate-700"
              role="region"
              aria-label="Wyniki analizy AI"
              dangerouslySetInnerHTML={{ __html: safeInsights }}
            />
          </section>
        )}
      </div>
    </article>
  );
};
