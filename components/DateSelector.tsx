import React from 'react';
import { DateRange, DateRangePreset } from '../types';
import { clsx } from 'clsx';

interface DateSelectorProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
  disabled?: boolean;
}

const PRESETS: { id: DateRangePreset; label: string; days: number }[] = [
  { id: '7d', label: '7 Dni', days: 7 },
  { id: '28d', label: '28 Dni', days: 28 },
  { id: '90d', label: '90 Dni', days: 90 },
  { id: '365d', label: 'Rok', days: 365 },
];

export const DateSelector: React.FC<DateSelectorProps> = ({ value, onChange, disabled }) => {
  const handlePresetClick = (preset: DateRangePreset, days: number) => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - days);
    onChange({ start, end, preset });
  };

  return (
    <fieldset
      className="flex flex-col gap-2 p-4 bg-white rounded-lg shadow-sm border border-slate-200"
      disabled={disabled}
      aria-label="Wybór zakresu danych"
    >
      <legend className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
        Zakres Danych
      </legend>
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Predefiniowane zakresy dat">
        {PRESETS.map((p) => (
          <button
            key={p.id}
            type="button"
            role="radio"
            aria-checked={value.preset === p.id}
            aria-label={`Zakres ${p.label}`}
            disabled={disabled}
            onClick={() => handlePresetClick(p.id, p.days)}
            className={clsx(
              "px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
              value.preset === p.id
                ? "bg-blue-600 text-white shadow-md"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200",
              disabled && "opacity-50 cursor-not-allowed"
            )}
          >
            {p.label}
          </button>
        ))}
      </div>
      <div
        className="flex items-center gap-2 mt-2 text-sm text-slate-600"
        aria-live="polite"
        aria-atomic="true"
      >
        <span className="font-mono bg-slate-50 px-2 py-1 rounded border border-slate-200">
          <time dateTime={value.start.toISOString()}>{value.start.toLocaleDateString()}</time>
        </span>
        <span aria-hidden="true">➔</span>
        <span className="sr-only">do</span>
        <span className="font-mono bg-slate-50 px-2 py-1 rounded border border-slate-200">
          <time dateTime={value.end.toISOString()}>{value.end.toLocaleDateString()}</time>
        </span>
      </div>
    </fieldset>
  );
};
