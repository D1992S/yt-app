import React from 'react';
import { ReportMode } from '@insight/shared';
import { REPORT_MODES } from '../constants';
import { Card, CardContent, Label } from './ui/DesignSystem';
import { Zap, FileText, BarChart2 } from 'lucide-react';
import { clsx } from 'clsx';

interface ReportConfigProps {
  mode: ReportMode;
  onChange: (mode: ReportMode) => void;
  disabled?: boolean;
}

const ICONS = {
  FAST: Zap,
  STANDARD: FileText,
  MAX: BarChart2,
};

export const ReportConfig: React.FC<ReportConfigProps> = ({ mode, onChange, disabled }) => {
  return (
    <Card>
      <CardContent className="space-y-4">
        <Label>Tryb Raportu</Label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {REPORT_MODES.map((m) => {
            const Icon = ICONS[m.mode as keyof typeof ICONS];
            const isSelected = mode === m.mode;
            return (
              <button
                key={m.mode}
                disabled={disabled}
                onClick={() => onChange(m.mode)}
                className={clsx(
                  "flex flex-col items-start p-3 rounded-lg border transition-all text-left h-full",
                  isSelected
                    ? "border-accent bg-accent/10 ring-1 ring-accent"
                    : "border-border bg-bg hover:bg-panel-2 hover:border-zinc-600",
                  disabled && "opacity-50 cursor-not-allowed"
                )}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <Icon size={16} className={isSelected ? "text-accent" : "text-text-muted"} />
                  <span className={clsx("font-semibold text-sm", isSelected ? "text-accent" : "text-text")}>
                    {m.label}
                  </span>
                </div>
                <span className="text-xs text-text-muted leading-tight">{m.description}</span>
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};