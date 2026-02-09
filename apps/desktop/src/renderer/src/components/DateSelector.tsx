import React from 'react';
import { DateRange, DateRangePreset } from '@insight/shared';
import { Card, CardContent, Label, Button } from './ui/DesignSystem';
import { Calendar } from 'lucide-react';
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
    <Card>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Calendar size={16} className="text-accent" />
          <Label className="mb-0">Zakres Danych</Label>
        </div>
        
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <Button
              key={p.id}
              disabled={disabled}
              onClick={() => handlePresetClick(p.id, p.days)}
              variant={value.preset === p.id ? 'primary' : 'secondary'}
              size="sm"
              className="flex-1 sm:flex-none"
            >
              {p.label}
            </Button>
          ))}
        </div>
        
        <div className="flex items-center justify-between text-sm bg-bg p-2 rounded border border-border">
          <span className="font-mono text-text-muted">{value.start.toLocaleDateString()}</span>
          <span className="text-text-muted">➔</span>
          <span className="font-mono text-text-muted">{value.end.toLocaleDateString()}</span>
        </div>
      </CardContent>
    </Card>
  );
};