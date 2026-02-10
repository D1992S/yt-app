import { DateRange, ReportMode } from './types';

export const DEFAULT_RANGE: DateRange = {
  start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
  end: new Date(),
  preset: '7d',
};

export const DEFAULT_MODE: ReportMode = 'standard';

export const MOCK_DATA_CATEGORIES = ['Sales', 'Traffic', 'Conversion'];

export const REPORT_MODES: { mode: ReportMode; label: string; description: string }[] = [
  { mode: 'quick', label: 'Szybki', description: 'Podstawowe metryki, bez AI' },
  { mode: 'standard', label: 'Standard', description: 'Pełne dane + Podsumowanie AI' },
  { mode: 'max', label: 'MAX', description: 'Głęboka analiza, predykcje, pełny audyt' },
];
