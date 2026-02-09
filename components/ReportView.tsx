import React from 'react';
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

interface ReportViewProps {
  data: ReportData;
}

export const ReportView: React.FC<ReportViewProps> = ({ data }) => {
  const { metrics, timeSeries, insights, mode } = data;

  return (
    <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="bg-slate-50 p-6 border-b border-slate-200 flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Raport Analityczny</h2>
          <p className="text-sm text-slate-500 mt-1">
            ID: <span className="font-mono">{data.id}</span> • {new Date(data.generatedAt).toLocaleString()}
          </p>
          <div className="mt-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            Tryb: {mode}
          </div>
        </div>
        <div className="flex gap-2">
          <button className="p-2 text-slate-600 hover:bg-white hover:shadow-sm rounded-md border border-transparent hover:border-slate-200 transition-all" title="Drukuj / PDF">
            <Printer size={20} />
          </button>
          <button className="p-2 text-slate-600 hover:bg-white hover:shadow-sm rounded-md border border-transparent hover:border-slate-200 transition-all" title="Pobierz JSON">
            <Download size={20} />
          </button>
        </div>
      </div>

      <div className="p-6 space-y-8">
        {/* Key Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
            <p className="text-xs text-slate-500 uppercase font-semibold">Suma Całkowita</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{metrics.total.toLocaleString()}</p>
          </div>
          <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
            <p className="text-xs text-slate-500 uppercase font-semibold">Średnia Dzienna</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{metrics.average.toFixed(1)}</p>
          </div>
          <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
            <p className="text-xs text-slate-500 uppercase font-semibold">Trend</p>
            <p className={`text-2xl font-bold mt-1 ${metrics.trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {metrics.trend > 0 ? '+' : ''}{metrics.trend.toFixed(1)}%
            </p>
          </div>
          <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
            <p className="text-xs text-slate-500 uppercase font-semibold">Zmienność</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{metrics.volatility.toFixed(1)}</p>
          </div>
        </div>

        {/* Chart */}
        <div className="h-[300px] w-full">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">Przebieg w czasie</h3>
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

        {/* AI Insights Section */}
        {mode !== 'FAST' && (
          <div className="border-t border-slate-200 pt-6">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2 h-2 rounded-full bg-purple-500 animate-pulse"></div>
              <h3 className="text-sm font-semibold text-slate-700">Interpretacja AI (Evidence Mode)</h3>
            </div>
            <div 
              className="prose prose-sm prose-slate max-w-none bg-purple-50 p-4 rounded-lg border border-purple-100 text-slate-700"
              dangerouslySetInnerHTML={{ __html: insights || 'Oczekiwanie na analizę...' }}
            />
          </div>
        )}
      </div>
    </div>
  );
};
