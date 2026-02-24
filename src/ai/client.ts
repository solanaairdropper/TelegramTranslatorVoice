import { AzureOpenAI } from 'openai';
import { config } from '../config.js';

let client: AzureOpenAI;

export function getAIClient(): AzureOpenAI {
  if (!client) {
    client = new AzureOpenAI({
      endpoint: config.azure.endpoint,
      apiKey: config.azure.apiKey,
      apiVersion: config.azure.apiVersion,
      deployment: config.azure.deployment,
    });
  }
  return client;
}

export async function chatCompletion(
  systemPrompt: string,
  userMessage: string,
  options?: { temperature?: number; maxTokens?: number }
): Promise<string> {
  const ai = getAIClient();
  const response = await ai.chat.completions.create({
    model: config.azure.deployment,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ],
    temperature: options?.temperature ?? 0.3,
    max_tokens: options?.maxTokens ?? 2000,
  });
  return response.choices[0]?.message?.content ?? '';
}

export async function chatCompletionJSON<T>(
  systemPrompt: string,
  userMessage: string,
  options?: { temperature?: number; maxTokens?: number }
): Promise<T> {
  const ai = getAIClient();
  const response = await ai.chat.completions.create({
    model: config.azure.deployment,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ],
    temperature: options?.temperature ?? 0.3,
    max_tokens: options?.maxTokens ?? 2000,
    response_format: { type: 'json_object' },
  });
  const text = response.choices[0]?.message?.content ?? '{}';
  return JSON.parse(text) as T;
}
