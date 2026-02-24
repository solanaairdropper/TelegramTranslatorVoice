import { getAIClient } from './client.js';
import { TRANSLATION_SYSTEM, buildTranslationUserPrompt } from './prompts.js';
import { config } from '../config.js';
import { TranslationResult } from './translate.js';

// Stream translation with real-time edits via callback
// Uses sendMessage + editMessageText pattern since sendMessageDraft
// requires forum topics mode which is impractical for standard DMs
export async function streamTranslation(
  params: {
    originalText: string;
    sourceLanguage: string;
    targetLanguage: string;
    targetDialect?: string;
    senderProfile?: string;
    receiverProfile?: string;
    conversationContext?: string;
    sentiment?: string;
    relationshipTone?: string;
  },
  onChunk: (partialText: string) => Promise<void>
): Promise<TranslationResult> {
  const ai = getAIClient();
  const userPrompt = buildTranslationUserPrompt(params);

  const stream = await ai.chat.completions.create({
    model: config.azure.deployment,
    messages: [
      { role: 'system', content: TRANSLATION_SYSTEM },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.2,
    max_tokens: 2000,
    response_format: { type: 'json_object' },
    stream: true,
  });

  let fullText = '';
  let lastEditTime = 0;
  const EDIT_INTERVAL = 400; // ms between edits to avoid flood

  for await (const chunk of stream) {
    const token = chunk.choices[0]?.delta?.content ?? '';
    fullText += token;

    // Throttle edits to ~2.5/sec to avoid Telegram flood
    const now = Date.now();
    if (now - lastEditTime >= EDIT_INTERVAL && fullText.length > 5) {
      // Try to extract partial "translated" field for preview
      const partial = extractPartialTranslation(fullText);
      if (partial) {
        try {
          await onChunk(partial);
          lastEditTime = now;
        } catch {
          // Edit failed (probably rate limited), skip
        }
      }
    }
  }

  // Parse final JSON
  try {
    const result = JSON.parse(fullText) as TranslationResult;
    return {
      literal: result.literal || params.originalText,
      translated: result.translated || result.literal || params.originalText,
      confidence: result.confidence ?? 0.8,
      sentiment: result.sentiment || 'neutral',
    };
  } catch {
    // If JSON parsing fails, try to extract what we can
    const partial = extractPartialTranslation(fullText);
    return {
      literal: partial || params.originalText,
      translated: partial || params.originalText,
      confidence: 0.5,
      sentiment: 'neutral',
    };
  }
}

// Try to pull the "translated" value from partial JSON
function extractPartialTranslation(json: string): string | null {
  // Look for "translated": "..." pattern
  const match = json.match(/"translated"\s*:\s*"([^"]*)/);
  if (match && match[1].length > 0) return match[1];

  // Fallback: try "literal"
  const litMatch = json.match(/"literal"\s*:\s*"([^"]*)/);
  if (litMatch && litMatch[1].length > 0) return litMatch[1];

  return null;
}
