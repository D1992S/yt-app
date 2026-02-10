import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ReportView } from '../ReportView';
import { ReportData } from '../../types';

// Mock recharts to avoid SVG rendering issues in jsdom
vi.mock('recharts', () => ({
  AreaChart: ({ children }: any) => <div data-testid="area-chart">{children}</div>,
  Area: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
}));

const mockReport: ReportData = {
  id: 'TEST1234',
  generatedAt: '2025-01-15T12:00:00.000Z',
  range: {
    start: new Date(2025, 0, 1),
    end: new Date(2025, 0, 8),
    preset: '7d',
  },
  mode: 'standard',
  metrics: {
    total: 12345,
    average: 1763.6,
    min: 100,
    max: 3000,
    trend: 5.2,
    volatility: 28.3,
  },
  timeSeries: [
    { date: '2025-01-01', value: 100, category: 'Views' },
    { date: '2025-01-02', value: 200, category: 'Views' },
  ],
  insights: '<p>Analiza testowa</p>',
  isOffline: false,
};

describe('ReportView', () => {
  it('renders the report header with ID and mode', () => {
    render(<ReportView data={mockReport} />);
    expect(screen.getByText('Raport Analityczny')).toBeInTheDocument();
    expect(screen.getByText('TEST1234')).toBeInTheDocument();
    expect(screen.getByText('Tryb: Standard')).toBeInTheDocument();
  });

  it('renders all four KPI metrics', () => {
    render(<ReportView data={mockReport} />);
    expect(screen.getByText('Suma Całkowita')).toBeInTheDocument();
    expect(screen.getByText('12,345')).toBeInTheDocument();
    expect(screen.getByText('Średnia Dzienna')).toBeInTheDocument();
    expect(screen.getByText('1763.6')).toBeInTheDocument();
    expect(screen.getByText('Trend')).toBeInTheDocument();
    expect(screen.getByText('+5.2%')).toBeInTheDocument();
    expect(screen.getByText('Zmienność')).toBeInTheDocument();
    expect(screen.getByText('28.3')).toBeInTheDocument();
  });

  it('renders the chart section', () => {
    render(<ReportView data={mockReport} />);
    expect(screen.getByText('Przebieg w czasie')).toBeInTheDocument();
    expect(screen.getByTestId('area-chart')).toBeInTheDocument();
  });

  it('renders AI insights for non-quick modes', () => {
    render(<ReportView data={mockReport} />);
    expect(screen.getByText('Interpretacja AI (Evidence Mode)')).toBeInTheDocument();
  });

  it('hides AI insights for quick mode', () => {
    const quickReport = { ...mockReport, mode: 'quick' as const };
    render(<ReportView data={quickReport} />);
    expect(screen.queryByText('Interpretacja AI (Evidence Mode)')).not.toBeInTheDocument();
  });

  it('shows correct trend direction styling', () => {
    render(<ReportView data={mockReport} />);
    const trendEl = screen.getByText('+5.2%');
    expect(trendEl.className).toContain('text-green-600');
  });

  it('shows negative trend with red styling', () => {
    const negativeReport = {
      ...mockReport,
      metrics: { ...mockReport.metrics, trend: -3.1 },
    };
    render(<ReportView data={negativeReport} />);
    const trendEl = screen.getByText('-3.1%');
    expect(trendEl.className).toContain('text-red-600');
  });

  it('uses article element with aria-label', () => {
    render(<ReportView data={mockReport} />);
    expect(screen.getByRole('article')).toHaveAttribute('aria-label', 'Raport analityczny TEST1234');
  });

  it('has accessible toolbar for action buttons', () => {
    render(<ReportView data={mockReport} />);
    expect(screen.getByRole('toolbar', { name: /akcje raportu/i })).toBeInTheDocument();
  });

  it('has accessible print and download buttons', () => {
    render(<ReportView data={mockReport} />);
    expect(screen.getByRole('button', { name: /drukuj/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /pobierz/i })).toBeInTheDocument();
  });
});
