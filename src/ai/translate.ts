import { chatCompletionJSON, chatCompletion } from './client.js';
import {
  TRANSLATION_SYSTEM,
  buildTranslationUserPrompt,
  CLARIFY_SYSTEM,
  buildClarifyPrompt,
  CONDENSE_SYSTEM,
  EXPAND_SYSTEM,
  TONE_CHECK_SYSTEM,
  MENU_TRANSLATE_SYSTEM,
  CONFUSION_DETECT_SYSTEM,
} from './prompts.js';

export interface TranslationResult {
  literal: string;
  translated: string;
  confidence: number;
  sentiment: string;
}

export async function translateMessage(params: {
  originalText: string;
  sourceLanguage: string;
  targetLanguage: string;
  targetDialect?: string;
  senderProfile?: string;
  receiverProfile?: string;
  conversationContext?: string;
  sentiment?: string;
  relationshipTone?: string;
}): Promise<TranslationResult> {
  const userPrompt = buildTranslationUserPrompt(params);
  const result = await chatCompletionJSON<TranslationResult>(
    TRANSLATION_SYSTEM,
    userPrompt,
    { temperature: 0.2 }
  );
  return {
    literal: result.literal || params.originalText,
    translated: result.translated || result.literal || params.originalText,
    confidence: result.confidence ?? 0.8,
    sentiment: result.sentiment || 'neutral',
  };
}

export async function retranslateWithMoreContext(params: {
  originalText: string;
  sourceLanguage: string;
  targetLanguage: string;
  targetDialect?: string;
  senderProfile?: string;
  receiverProfile?: string;
  conversationContext?: string;
  sentiment?: string;
  relationshipTone?: string;
}): Promise<TranslationResult> {
  // Same as translate but with lower temperature for more precision
  const userPrompt = buildTranslationUserPrompt(params);
  return chatCompletionJSON<TranslationResult>(
    TRANSLATION_SYSTEM,
    userPrompt,
    { temperature: 0.1 }
  );
}

export async function clarifyMessage(params: {
  originalText: string;
  translatedText: string;
  readerLanguage: string;
  conversationContext?: string;
}): Promise<string> {
  return chatCompletion(
    CLARIFY_SYSTEM,
    buildClarifyPrompt(params),
    { temperature: 0.3 }
  );
}

export async function condenseMessage(text: string, language: string): Promise<string> {
  return chatCompletion(
    CONDENSE_SYSTEM,
    `Language: ${language}\n\nText to condense:\n${text}`,
    { temperature: 0.2 }
  );
}

export async function expandMessage(text: string, language: string, context?: string): Promise<string> {
  let prompt = `Language: ${language}\n\nText to expand:\n${text}`;
  if (context) prompt += `\n\nConversation context:\n${context}`;
  return chatCompletion(
    EXPAND_SYSTEM,
    prompt,
    { temperature: 0.3 }
  );
}

export async function toneCheck(text: string, readerLanguage: string, context?: string): Promise<string> {
  let prompt = `Reader language: ${readerLanguage}\n\nMessage to analyze:\n${text}`;
  if (context) prompt += `\n\nConversation context:\n${context}`;
  return chatCompletion(
    TONE_CHECK_SYSTEM,
    prompt,
    { temperature: 0.2 }
  );
}

export async function translateMenuText(text: string, targetLanguage: string): Promise<string> {
  return chatCompletion(
    MENU_TRANSLATE_SYSTEM,
    `Translate to ${targetLanguage}:\n${text}`,
    { temperature: 0.1, maxTokens: 200 }
  );
}

export interface ConfusionAnalysis {
  isTranslationConfusion: boolean;
  confidence: number;
  suggestedRetranslation: string;
}

export async function detectConfusion(params: {
  recentMessages: string;
  lastTranslation: string;
  userResponse: string;
}): Promise<ConfusionAnalysis> {
  return chatCompletionJSON<ConfusionAnalysis>(
    CONFUSION_DETECT_SYSTEM,
    `Recent conversation:\n${params.recentMessages}\n\nLast translation sent:\n${params.lastTranslation}\n\nUser response indicating confusion:\n${params.userResponse}`,
    { temperature: 0.2 }
  );
}
