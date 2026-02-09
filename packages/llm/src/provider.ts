import { GoogleGenAI } from '@google/genai';

export interface LLMProvider {
  generateText(prompt: string, systemInstruction?: string): Promise<string>;
  generateJson<T>(prompt: string, schema?: any, systemInstruction?: string): Promise<T>;
}

export class GoogleGenAIProvider implements LLMProvider {
  private client: GoogleGenAI;
  private model = 'gemini-2.5-flash';

  constructor(apiKey: string) {
    this.client = new GoogleGenAI({ apiKey, vertexai: true });
  }

  async generateText(prompt: string, systemInstruction?: string): Promise<string> {
    try {
      const response = await this.client.models.generateContent({
        model: this.model,
        contents: { role: 'user', parts: [{ text: prompt }] },
        config: {
          systemInstruction,
          temperature: 0.3,
        }
      });
      return response.text || '';
    } catch (e) {
      console.error('LLM Text Gen Error:', e);
      throw new Error('Failed to generate text response');
    }
  }

  async generateJson<T>(prompt: string, schema?: any, systemInstruction?: string): Promise<T> {
    try {
      const response = await this.client.models.generateContent({
        model: this.model,
        contents: { role: 'user', parts: [{ text: prompt }] },
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          // responseSchema: schema, // Optional: strict schema validation if needed
          temperature: 0.1,
        }
      });
      return JSON.parse(response.text || '{}') as T;
    } catch (e) {
      console.error('LLM JSON Gen Error:', e);
      throw new Error('Failed to generate JSON response');
    }
  }
}

export class LocalStubProvider implements LLMProvider {
  async generateText(prompt: string): Promise<string> {
    return `[STUB] I received your prompt: "${prompt.substring(0, 50)}...". I am running in offline mode.`;
  }

  async generateJson<T>(prompt: string): Promise<T> {
    // Return a generic empty object or mock based on prompt keywords
    if (prompt.includes('intent')) {
      return { intent: 'general_knowledge' } as unknown as T;
    }
    return {} as T;
  }
}
