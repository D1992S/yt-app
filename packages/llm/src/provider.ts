import OpenAI from 'openai';
import { GoogleGenAI } from '@google/genai';

export type LLMProviderName = 'openai' | 'gemini';

export type LLMMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

export type GenerateTextInput = {
  provider: LLMProviderName;
  model: string;
  messages: LLMMessage[];
  temperature?: number;
  maxOutputTokens?: number;
};

export interface LLMProvider {
  generateText(input: Omit<GenerateTextInput, 'provider'>): Promise<string>;
}

export class OpenAIProvider implements LLMProvider {
  private client: OpenAI;

  constructor(apiKey = process.env.OPENAI_API_KEY) {
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY is not set');
    }

    this.client = new OpenAI({ apiKey });
  }

  async generateText(input: Omit<GenerateTextInput, 'provider'>): Promise<string> {
    const response = await this.client.chat.completions.create({
      model: input.model,
      messages: input.messages,
      temperature: input.temperature,
      max_tokens: input.maxOutputTokens,
    });

    return response.choices[0]?.message?.content ?? '';
  }
}

export class GeminiProvider implements LLMProvider {
  private client: GoogleGenAI;

  constructor(apiKey = process.env.GEMINI_API_KEY) {
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not set');
    }

    this.client = new GoogleGenAI({ apiKey });
  }

  async generateText(input: Omit<GenerateTextInput, 'provider'>): Promise<string> {
    const systemInstruction = input.messages.find((message) => message.role === 'system')?.content;
    const contents = input.messages
      .filter((message) => message.role !== 'system')
      .map((message) => ({
        role: message.role,
        parts: [{ text: message.content }],
      }));

    const response = await this.client.models.generateContent({
      model: input.model,
      contents,
      config: {
        systemInstruction,
        temperature: input.temperature,
        maxOutputTokens: input.maxOutputTokens,
      },
    });

    return response.text ?? '';
  }
}

export class LocalStubProvider implements LLMProvider {
  async generateText(input: Omit<GenerateTextInput, 'provider'>): Promise<string> {
    const prompt = input.messages.map((message) => message.content).join('\n');
    return `[STUB] I received your prompt: "${prompt.substring(0, 50)}...". I am running in offline mode.`;
  }
}

export class ProviderRegistry {
  constructor(private readonly providers: Partial<Record<LLMProviderName, LLMProvider>>) {}

  async generateText(input: GenerateTextInput): Promise<string> {
    const provider = this.providers[input.provider];
    if (!provider) {
      throw new Error(`Provider \"${input.provider}\" is not configured`);
    }

    return provider.generateText({
      model: input.model,
      messages: input.messages,
      temperature: input.temperature,
      maxOutputTokens: input.maxOutputTokens,
    });
  }
}

export const generateText = async (
  input: GenerateTextInput,
  registry: ProviderRegistry
): Promise<string> => registry.generateText(input);
