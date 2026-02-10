import { describe, expect, it } from 'vitest';
import { LOCAL_STUB_LLM_RESPONSE } from '@insight/llm/stub';
import { resolveLlmConfig, respondInFakeMode } from '../llm-runtime';

describe('resolveLlmConfig', () => {
  it('uses saved settings when request provider/model are invalid or empty', () => {
    const config = resolveLlmConfig({
      providerMode: 'real',
      request: {
        question: 'Czy działa fallback?',
        provider: undefined,
        model: '   ',
      },
      savedSettings: {
        provider: 'gemini',
        model: 'gemini-2.5-flash',
      },
      hasOpenAiKey: false,
      hasGeminiKey: true,
    });

    expect(config).toEqual({
      provider: 'gemini',
      plannerModel: 'gemini-2.5-flash',
      summarizerModel: 'gemini-2.5-flash',
    });
  });

  it('throws when selected provider does not have required API key', () => {
    expect(() =>
      resolveLlmConfig({
        providerMode: 'real',
        request: {
          question: 'Q',
          provider: 'openai',
          model: 'gpt-4o-mini',
        },
        savedSettings: {
          provider: 'gemini',
          model: 'gemini-2.5-flash',
        },
        hasOpenAiKey: false,
        hasGeminiKey: true,
      })
    ).toThrow('OPENAI_API_KEY missing for selected provider');
  });
});

describe('respondInFakeMode', () => {
  it('returns deterministic stub response', () => {
    const response = respondInFakeMode('test fake mode');

    expect(response.role).toBe('assistant');
    expect(response.content).toContain(LOCAL_STUB_LLM_RESPONSE);
    expect(response.content).toContain('Pytanie: test fake mode');
    expect(response.evidence).toEqual([{ source: 'Fake fixture', data: { mode: 'fake' } }]);
  });
});
