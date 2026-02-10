import { ChatMessage } from '@insight/shared';
import { buildLocalStubText } from '@insight/llm/stub';

export const buildFakeLlmResponse = (question: string): ChatMessage => ({
  role: 'assistant',
  content: buildLocalStubText(question),
  timestamp: Date.now(),
  evidence: [{ source: 'Fake fixture', data: { mode: 'fake' } }],
});
