import { describe, expect, it, vi } from 'vitest';
import { buildFakeLlmResponse } from '../llm-fixtures';
import { LOCAL_STUB_LLM_RESPONSE } from '@insight/llm/stub';

describe('buildFakeLlmResponse', () => {
  it('builds deterministic fake response for IPC generate/ask flow', () => {
    vi.spyOn(Date, 'now').mockReturnValue(1717171717);

    const response = buildFakeLlmResponse('  test bez kluczy  ');

    expect(response).toEqual({
      role: 'assistant',
      content: `${LOCAL_STUB_LLM_RESPONSE}\nPytanie: test bez kluczy`,
      timestamp: 1717171717,
      evidence: [{ source: 'Fake fixture', data: { mode: 'fake' } }],
    });
  });
});
