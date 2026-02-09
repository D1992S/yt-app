import { GoogleGenAI } from '@google/genai';
import { MetricResult, DateRange } from '../../types';

// Guardrails: Evidence Mode
const SYSTEM_INSTRUCTION = `
You are a strict data analyst for a business report. 
Your job is to interpret the provided metrics.
RULES:
1. ONLY use the numbers provided in the JSON context.
2. DO NOT invent, hallucinate, or estimate numbers not present in the input.
3. If the trend is positive, mention it. If negative, warn about it.
4. Keep the tone professional, concise, and objective.
5. Output format: HTML paragraphs (<p>).
`;

export const generateInsights = async (
  metrics: MetricResult,
  range: DateRange
): Promise<string> => {
  const apiKey = process.env.API_KEY;
  
  if (!apiKey) {
    console.warn("No API Key found. Skipping LLM insights.");
    return "<p><em>LLM Insights unavailable (Missing API Key). Showing raw metrics only.</em></p>";
  }

  try {
    const ai = new GoogleGenAI({ apiKey, vertexai: true });
    
    const prompt = `
      Analyze the following report data:
      Date Range: ${range.start.toLocaleDateString()} to ${range.end.toLocaleDateString()}
      
      Metrics:
      - Total Volume: ${metrics.total}
      - Daily Average: ${metrics.average.toFixed(2)}
      - Peak Value: ${metrics.max}
      - Lowest Value: ${metrics.min}
      - Trend (First half vs Second half): ${metrics.trend.toFixed(2)}%
      - Volatility (StdDev): ${metrics.volatility.toFixed(2)}
      
      Provide a summary of performance and 2 key takeaways.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        role: 'user',
        parts: [{ text: prompt }]
      },
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0.2, // Low temperature for deterministic/factual output
      }
    });

    return response.text || "<p>No insights generated.</p>";
  } catch (error) {
    console.error("LLM Generation Error:", error);
    return `<p class="text-red-500">Error generating insights: ${(error as Error).message}</p>`;
  }
};
