import React from 'react';
import { ReportMode } from '../types';
import { REPORT_MODES } from '../constants';
import { clsx } from 'clsx';
import { Zap, FileText, BarChart2 } from 'lucide-react';

interface ReportConfigProps {
  mode: ReportMode;
  onChange: (mode: ReportMode) => void;
  disabled?: boolean;
}

const ICONS: Record<string, typeof Zap> = {
  quick: Zap,
  standard: FileText,
  max: BarChart2,
};

export const ReportConfig: React.FC<ReportConfigProps> = ({ mode, onChange, disabled }) => {
  return (
    <fieldset
      className="flex flex-col gap-2 p-4 bg-white rounded-lg shadow-sm border border-slate-200"
      disabled={disabled}
      aria-label="Konfiguracja trybu raportu"
    >
      <legend className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
        Tryb Raportu
      </legend>
      <div
        className="grid grid-cols-1 sm:grid-cols-3 gap-3"
        role="radiogroup"
        aria-label="Wybierz tryb raportu"
      >
        {REPORT_MODES.map((m) => {
          const Icon = ICONS[m.mode];
          const isSelected = mode === m.mode;
          return (
            <button
              key={m.mode}
              type="button"
              role="radio"
              aria-checked={isSelected}
              aria-label={`${m.label}: ${m.description}`}
              disabled={disabled}
              onClick={() => onChange(m.mode)}
              className={clsx(
                "flex flex-col items-start p-3 rounded-lg border transition-all text-left",
                isSelected
                  ? "border-blue-500 bg-blue-50 ring-1 ring-blue-500"
                  : "border-slate-200 hover:border-slate-300 hover:bg-slate-50",
                disabled && "opacity-50 cursor-not-allowed"
              )}
            >
              <div className="flex items-center gap-2 mb-1">
                <Icon size={16} aria-hidden="true" className={isSelected ? "text-blue-600" : "text-slate-500"} />
                <span className={clsx("font-semibold text-sm", isSelected ? "text-blue-900" : "text-slate-700")}>
                  {m.label}
                </span>
              </div>
              <span className="text-xs text-slate-500 leading-tight">{m.description}</span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
};
