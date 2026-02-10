import React from 'react';
import { Bot } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, Input, Label } from './ui/DesignSystem';

type LlmProvider = 'openai' | 'gemini';

export interface LlmSettingsFormState {
  provider: LlmProvider;
  model: string;
  temperature?: number;
  maxOutputTokens?: number;
}

interface LlmSettingsPanelProps {
  settings: LlmSettingsFormState;
  isLoading: boolean;
  isSaving: boolean;
  error?: string;
  onChange: (settings: LlmSettingsFormState) => void;
}

const parseOptionalNumber = (value: string): number | undefined => {
  const normalized = value.trim();
  if (!normalized) return undefined;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : undefined;
};

export const LlmSettingsPanel: React.FC<LlmSettingsPanelProps> = ({ settings, isLoading, isSaving, error, onChange }) => {
  const handleProviderChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    onChange({ ...settings, provider: event.target.value as LlmProvider });
  };

  const handleModelChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onChange({ ...settings, model: event.target.value });
  };

  const handleTemperatureChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onChange({ ...settings, temperature: parseOptionalNumber(event.target.value) });
  };

  const handleMaxOutputTokensChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onChange({ ...settings, maxOutputTokens: parseOptionalNumber(event.target.value) });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <Bot size={16} />
          Settings
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="rounded-lg border border-danger/20 bg-danger/10 p-3 text-sm text-danger">
            {error}
          </div>
        )}

        <div>
          <Label>Provider</Label>
          <select
            value={settings.provider}
            onChange={handleProviderChange}
            disabled={isLoading}
            className="flex h-9 w-full rounded-md border border-border bg-bg px-3 py-1 text-sm text-text shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-50"
          >
            <option value="openai">openai</option>
            <option value="gemini">gemini</option>
          </select>
        </div>

        <div>
          <Label>Model</Label>
          <Input
            value={settings.model}
            onChange={handleModelChange}
            disabled={isLoading}
            placeholder="np. gpt-4.1-mini"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <Label>Temperature (opcjonalnie)</Label>
            <Input
              type="number"
              step="0.1"
              value={settings.temperature ?? ''}
              onChange={handleTemperatureChange}
              disabled={isLoading}
              placeholder="np. 0.3"
            />
          </div>

          <div>
            <Label>Max output tokens (opcjonalnie)</Label>
            <Input
              type="number"
              step="1"
              value={settings.maxOutputTokens ?? ''}
              onChange={handleMaxOutputTokensChange}
              disabled={isLoading}
              placeholder="np. 1024"
            />
          </div>
        </div>

        <div className="text-xs text-text-muted">
          {isLoading ? 'Ładowanie ustawień...' : isSaving ? 'Zapisywanie zmian...' : 'Zmiany zapisują się automatycznie.'}
        </div>
      </CardContent>
    </Card>
  );
};
