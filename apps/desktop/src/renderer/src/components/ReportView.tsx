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
import { Card, CardHeader, CardContent, Button } from './ui/DesignSystem';

interface ReportViewProps {
  data: ReportData;
}

export const ReportView: React.FC<ReportViewProps> = ({ data }) => {
  const { metrics, timeSeries, insights, mode } = data;

  return (
    <Card className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <CardHeader>
        <div>
          <h2 className="text-xl font-bold text-text">Raport Analityczny</h2>
          <p className="text-xs text-text-muted mt-1">
            ID: <span className="font-mono text-accent">{data.id}</span> • {new Date(data.generatedAt).toLocaleString()}
          </p>
          <div className="mt-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            Tryb: {mode}
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="icon" title="Drukuj / PDF">
            <Printer size={18} />
          </Button>
          <Button variant="secondary" size="icon" title="Pobierz JSON">
            <Download size={18} />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-8">
        {/* Key Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Suma Całkowita', value: metrics.total.toLocaleString() },
            { label: 'Średnia Dzienna', value: metrics.average.toFixed(1) },
            { label: 'Trend', value: `${metrics.trend > 0 ? '+' : ''}${metrics.trend.toFixed(1)}%`, color: metrics.trend >= 0 ? 'text-success' : 'text-danger' },
            { label: 'Zmienność', value: metrics.volatility.toFixed(1) }
          ].map((m, i) => (
            <div key={i} className="p-4 bg-bg rounded-lg border border-border">
              <p className="text-xs text-text-muted uppercase font-semibold">{m.label}</p>
              <p className={`text-2xl font-bold mt-1 ${m.color || 'text-text'}`}>{m.value}</p>
            </div>
          ))}
        </div>

        {/* Chart */}
        <div className="h-[300px] w-full">
          <h3 className="text-sm font-semibold text-text-muted mb-4">Przebieg w czasie</h3>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={timeSeries}>
              <defs>
                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#27272a" />
              <XAxis 
                dataKey="date" 
                tick={{fontSize: 12, fill: '#a1a1aa'}} 
                tickLine={false}
                axisLine={false}
                minTickGap={30}
              />
              <YAxis 
                tick={{fontSize: 12, fill: '#a1a1aa'}} 
                tickLine={false}
                axisLine={false}
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: '#18181b', 
                  borderColor: '#27272a', 
                  borderRadius: '8px', 
                  color: '#f4f4f5'
                }}
                itemStyle={{ color: '#f4f4f5' }}
              />
              <Area 
                type="monotone" 
                dataKey="value" 
                stroke="#3b82f6" 
                strokeWidth={2}
                fillOpacity={1} 
                fill="url(#colorValue)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* AI Insights Section */}
        {mode !== 'FAST' && (
          <div className="border-t border-border pt-6">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2 h-2 rounded-full bg-purple-500 animate-pulse"></div>
              <h3 className="text-sm font-semibold text-text">Interpretacja AI (Evidence Mode)</h3>
            </div>
            <div 
              className="prose prose-sm prose-invert max-w-none bg-purple-500/5 p-4 rounded-lg border border-purple-500/20 text-text-muted"
              dangerouslySetInnerHTML={{ __html: insights || 'Oczekiwanie na analizę...' }}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
};