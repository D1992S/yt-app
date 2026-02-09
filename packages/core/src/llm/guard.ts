import crypto from 'crypto';
import { repo } from '../db/repo';
import { LLMProvider } from '@insight/llm';

const DAILY_TOKEN_LIMIT = 100000;
const DAILY_COST_LIMIT_USD = 1.0;

export class GuardedLLMProvider implements LLMProvider {
  private provider: LLMProvider;

  constructor(provider: LLMProvider) {
    this.provider = provider;
  }

  private getHash(input: string): string {
    return crypto.createHash('md5').update(input).digest('hex');
  }

  private checkLimits() {
    const today = new Date().toISOString().split('T')[0];
    const usage = repo.getLlmUsage(today);
    if (usage) {
      if (usage.tokens_used > DAILY_TOKEN_LIMIT) throw new Error('Daily token limit exceeded');
      if (usage.cost_estimate > DAILY_COST_LIMIT_USD) throw new Error('Daily cost limit exceeded');
    }
  }

  private redact(text: string): string {
    // Simple redaction for emails and potential IDs
    return text
      .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[EMAIL]')
      .replace(/\b\d{4}-\d{4}-\d{4}-\d{4}\b/g, '[CARD]');
  }

  private async trackUsage(response: string) {
    // Rough estimation: 1 token ~= 4 chars
    const tokens = Math.ceil(response.length / 4);
    // Rough cost: $0.50 / 1M tokens (Gemini Flash pricing approx)
    const cost = (tokens / 1000000) * 0.50;
    
    const today = new Date().toISOString().split('T')[0];
    repo.incrementLlmUsage(today, tokens, cost);
  }

  async generateText(prompt: string, systemInstruction?: string): Promise<string> {
    this.checkLimits();
    const safePrompt = this.redact(prompt);
    const hash = this.getHash(safePrompt + (systemInstruction || ''));

    const cached = repo.getLlmCache(hash);
    if (cached) return cached.response;

    try {
      const response = await this.provider.generateText(safePrompt, systemInstruction);
      repo.setLlmCache(hash, response);
      await this.trackUsage(response);
      return response;
    } catch (e) {
      console.error('LLM Error, falling back:', e);
      throw e; // Let caller handle fallback or UI error
    }
  }

  async generateJson<T>(prompt: string, schema?: any, systemInstruction?: string): Promise<T> {
    this.checkLimits();
    const safePrompt = this.redact(prompt);
    const hash = this.getHash(safePrompt + (systemInstruction || '') + 'JSON');

    const cached = repo.getLlmCache(hash);
    if (cached) return JSON.parse(cached.response);

    try {
      const response = await this.provider.generateJson<T>(safePrompt, schema, systemInstruction);
      repo.setLlmCache(hash, JSON.stringify(response));
      await this.trackUsage(JSON.stringify(response));
      return response;
    } catch (e) {
      console.error('LLM JSON Error:', e);
      throw e;
    }
  }
}
