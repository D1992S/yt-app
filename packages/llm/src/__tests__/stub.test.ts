import { describe, expect, it } from 'vitest';
import { LOCAL_STUB_LLM_RESPONSE, buildLocalStubText } from '../stub';

describe('buildLocalStubText', () => {
  it('returns deterministic stub answer without API keys', () => {
    const response = buildLocalStubText('Ile było wyświetleń?');

    expect(response).toBe(`${LOCAL_STUB_LLM_RESPONSE}\nPytanie: Ile było wyświetleń?`);
  });

  it('returns base stub response when question is empty', () => {
    expect(buildLocalStubText('   ')).toBe(LOCAL_STUB_LLM_RESPONSE);
  });
});
