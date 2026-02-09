import { ReportData, MetricResult, percentChange } from '@insight/shared';
import { Anomaly } from './anomaly';

export const generateHtmlReport = (
  data: ReportData, 
  anomalies: Anomaly[], 
  prevMetrics: MetricResult | null
): string => {
  const { metrics, timeSeries, range, mode } = data;
  
  const chartLabels = JSON.stringify(timeSeries.map(d => d.date));
  const chartValues = JSON.stringify(timeSeries.map(d => d.value));

  const diffHtml = (current: number, prev: number) => {
    if (!prev) return '<span class="text-gray-400">-</span>';
    const diff = percentChange(current, prev);
    const color = diff >= 0 ? 'text-green-600' : 'text-red-600';
    return `<span class="${color} text-sm font-bold">${diff > 0 ? '+' : ''}${diff.toFixed(1)}%</span>`;
  };

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>InsightEngine Report - ${data.id}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <style>
    @media print { .no-print { display: none; } }
    body { font-family: 'Segoe UI', sans-serif; background: #f8fafc; }
  </style>
</head>
<body class="p-8 max-w-5xl mx-auto">
  <div class="bg-white p-8 rounded-xl shadow-sm border border-slate-200">
    
    <!-- Header -->
    <div class="flex justify-between items-start border-b border-slate-100 pb-6 mb-6">
      <div>
        <h1 class="text-3xl font-bold text-slate-800">Raport Analityczny</h1>
        <p class="text-slate-500 mt-1">ID: ${data.id} • ${new Date().toLocaleString()}</p>
      </div>
      <div class="text-right">
        <div class="text-sm font-semibold text-slate-600">Zakres</div>
        <div class="font-mono text-slate-800">${new Date(range.dateFrom).toLocaleDateString()} - ${new Date(range.dateTo).toLocaleDateString()}</div>
        <div class="mt-1 inline-block px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded font-bold">${mode.toUpperCase()}</div>
      </div>
    </div>

    <!-- KPI Cards -->
    <div class="grid grid-cols-4 gap-4 mb-8">
      <div class="p-4 bg-slate-50 rounded border border-slate-100">
        <div class="text-xs text-slate-500 uppercase font-bold">Views Total</div>
        <div class="text-2xl font-bold text-slate-900">${metrics.total.toLocaleString()}</div>
        ${prevMetrics ? diffHtml(metrics.total, prevMetrics.total) : ''}
      </div>
      <div class="p-4 bg-slate-50 rounded border border-slate-100">
        <div class="text-xs text-slate-500 uppercase font-bold">Daily Avg</div>
        <div class="text-2xl font-bold text-slate-900">${metrics.average.toFixed(0)}</div>
        ${prevMetrics ? diffHtml(metrics.average, prevMetrics.average) : ''}
      </div>
      <div class="p-4 bg-slate-50 rounded border border-slate-100">
        <div class="text-xs text-slate-500 uppercase font-bold">Peak</div>
        <div class="text-2xl font-bold text-slate-900">${metrics.max.toLocaleString()}</div>
      </div>
      <div class="p-4 bg-slate-50 rounded border border-slate-100">
        <div class="text-xs text-slate-500 uppercase font-bold">Volatility</div>
        <div class="text-2xl font-bold text-slate-900">${metrics.volatility.toFixed(1)}</div>
      </div>
    </div>

    <!-- Chart -->
    <div class="mb-8 h-80">
      <canvas id="mainChart"></canvas>
    </div>

    <!-- Anomalies -->
    ${anomalies.length > 0 ? `
    <div class="mb-8">
      <h3 class="text-lg font-bold text-slate-800 mb-3">Wykryte Anomalie</h3>
      <div class="bg-red-50 border border-red-100 rounded-lg p-4">
        <ul class="list-disc list-inside text-sm text-red-800">
          ${anomalies.map(a => `
            <li>
              <strong>${a.date}</strong>: Wartość ${a.value} (Oczekiwano: ${a.expected.toFixed(0)}) 
              - Odchylenie ${a.deviation.toFixed(1)}σ
            </li>
          `).join('')}
        </ul>
      </div>
    </div>
    ` : ''}

    <!-- AI Insights -->
    ${data.insights ? `
    <div class="border-t border-slate-100 pt-6">
      <h3 class="text-lg font-bold text-slate-800 mb-3">AI Insights</h3>
      <div class="prose prose-slate max-w-none bg-purple-50 p-4 rounded border border-purple-100">
        ${data.insights}
      </div>
    </div>
    ` : ''}

  </div>

  <script>
    const ctx = document.getElementById('mainChart');
    new Chart(ctx, {
      type: 'line',
      data: {
        labels: ${chartLabels},
        datasets: [{
          label: 'Views',
          data: ${chartValues},
          borderColor: '#2563eb',
          backgroundColor: 'rgba(37, 99, 235, 0.1)',
          fill: true,
          tension: 0.3
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          y: { beginAtZero: true, grid: { color: '#f1f5f9' } },
          x: { grid: { display: false } }
        }
      }
    });
  </script>
</body>
</html>
  `;
};
