import { QueryPlan, ChatMessage } from '@insight/shared';
import { PLANNER_SYSTEM_PROMPT, SUMMARIZER_SYSTEM_PROMPT } from './prompts';
import { LLMProviderName, ProviderRegistry, generateText } from './provider';

export interface DataExecutor {
  executePlan(plan: QueryPlan): Promise<any>;
}

export interface OrchestratorModelConfig {
  provider: LLMProviderName;
  plannerModel: string;
  summarizerModel: string;
}

export class LLMOrchestrator {
  private executor: DataExecutor;

  constructor(
    private readonly providerRegistry: ProviderRegistry,
    executor: DataExecutor,
    private readonly modelConfig: OrchestratorModelConfig
  ) {
    this.executor = executor;
  }

  async processMessage(userMessage: string): Promise<ChatMessage> {
    console.log('[LLM] Planning query for:', userMessage);
    const planResponse = await generateText(
      {
        provider: this.modelConfig.provider,
        model: this.modelConfig.plannerModel,
        messages: [
          { role: 'system', content: PLANNER_SYSTEM_PROMPT },
          { role: 'user', content: userMessage },
        ],
        temperature: 0.1,
      },
      this.providerRegistry
    );

    const plan = JSON.parse(planResponse || '{}') as QueryPlan;
    console.log('[LLM] Generated Plan:', JSON.stringify(plan));

    let dataContext: any = null;
    let evidence: any[] = [];

    if (plan.intent !== 'general_knowledge') {
      try {
        dataContext = await this.executor.executePlan(plan);
        evidence.push({ source: `DB Query (${plan.intent})`, data: dataContext });
      } catch (e) {
        console.error('[LLM] Execution Error:', e);
        dataContext = { error: 'Failed to retrieve data.' };
      }
    }

    const contextString = JSON.stringify(dataContext, null, 2);
    const safeContext = contextString.length > 20000 ? contextString.substring(0, 20000) + '...[TRUNCATED]' : contextString;

    const prompt = `
    User Question: "${userMessage}"

    Data Context:
    ${safeContext}
    `;

    const responseText = await generateText(
      {
        provider: this.modelConfig.provider,
        model: this.modelConfig.summarizerModel,
        messages: [
          { role: 'system', content: SUMMARIZER_SYSTEM_PROMPT },
          { role: 'user', content: prompt },
        ],
        temperature: 0.3,
      },
      this.providerRegistry
    );

    return {
      role: 'assistant',
      content: responseText,
      timestamp: Date.now(),
      evidence,
    };
  }
}
