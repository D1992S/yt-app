import { LLMProvider } from './provider';
import { PLANNER_SYSTEM_PROMPT, SUMMARIZER_SYSTEM_PROMPT } from './prompts';
import { QueryPlan, ChatMessage } from '@insight/shared';

export interface DataExecutor {
  executePlan(plan: QueryPlan): Promise<any>;
}

export class LLMOrchestrator {
  private provider: LLMProvider;
  private executor: DataExecutor;

  constructor(provider: LLMProvider, executor: DataExecutor) {
    this.provider = provider;
    this.executor = executor;
  }

  async processMessage(userMessage: string): Promise<ChatMessage> {
    // 1. Plan
    console.log('[LLM] Planning query for:', userMessage);
    const plan = await this.provider.generateJson<QueryPlan>(
      userMessage,
      undefined,
      PLANNER_SYSTEM_PROMPT
    );
    console.log('[LLM] Generated Plan:', JSON.stringify(plan));

    // 2. Execute
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

    // 3. Summarize
    const contextString = JSON.stringify(dataContext, null, 2);
    // Truncate context if too large (simple guardrail)
    const safeContext = contextString.length > 20000 ? contextString.substring(0, 20000) + '...[TRUNCATED]' : contextString;

    const prompt = `
    User Question: "${userMessage}"
    
    Data Context:
    ${safeContext}
    `;

    const responseText = await this.provider.generateText(prompt, SUMMARIZER_SYSTEM_PROMPT);

    return {
      role: 'assistant',
      content: responseText,
      timestamp: Date.now(),
      evidence
    };
  }
}
