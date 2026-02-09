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
    <div className="flex flex-col gap-2 p-4 bg-white rounded-lg shadow-sm border border-slate-200">
      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Zakres Danych</label>
      <div className="flex flex-wrap gap-2">
        {PRESETS.map((p) => (
          <button
            key={p.id}
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
      <div className="flex items-center gap-2 mt-2 text-sm text-slate-600">
        <span className="font-mono bg-slate-50 px-2 py-1 rounded border border-slate-200">
          {value.start.toLocaleDateString()}
        </span>
        <span>➔</span>
        <span className="font-mono bg-slate-50 px-2 py-1 rounded border border-slate-200">
          {value.end.toLocaleDateString()}
        </span>
      </div>
    </div>
  );
};
