import { AppError } from '@insight/shared';
import { LLMProviderName } from '@insight/llm';
import { buildFakeLlmResponse } from './llm-fixtures';

export interface LlmRuntimeConfig {
  provider: LLMProviderName;
  plannerModel: string;
  summarizerModel: string;
}

interface ResolveLlmConfigInput {
  providerMode: 'fake' | 'real';
  request: {
    provider?: 'openai' | 'gemini';
    model?: string;
    question: string;
  };
  savedSettings: {
    provider: 'openai' | 'gemini';
    model: string;
  };
  hasOpenAiKey: boolean;
  hasGeminiKey: boolean;
}

export const resolveLlmConfig = ({
  providerMode,
  request,
  savedSettings,
  hasOpenAiKey,
  hasGeminiKey,
}: ResolveLlmConfigInput): LlmRuntimeConfig => {
  const provider = request.provider || savedSettings.provider;
  const model = (request.model || '').trim() || savedSettings.model;

  if (!model) {
    throw new AppError('VALIDATION_ERROR', 'Model name is required');
  }

  if (providerMode === 'real') {
    if (provider === 'openai' && !hasOpenAiKey) {
      throw new AppError('VALIDATION_ERROR', 'OPENAI_API_KEY missing for selected provider');
    }
    if (provider === 'gemini' && !hasGeminiKey) {
      throw new AppError('VALIDATION_ERROR', 'GEMINI_API_KEY missing for selected provider');
    }
  }

  return {
    provider,
    plannerModel: model,
    summarizerModel: model,
  };
};

export const respondInFakeMode = (question: string) => buildFakeLlmResponse(question);
