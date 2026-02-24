import { config } from '../config.js';
import { detectConfusion, retranslateWithMoreContext, TranslationResult } from './translate.js';

const CONFUSION_PHRASES = [
  'don\'t understand', 'doesn\'t make sense', 'what do you mean',
  'bad translation', 'wrong translation', 'that\'s not right',
  'no entiendo', 'no comprendo', 'pas compris', 'verstehe nicht',
  'わからない', '不明白', '이해가 안', 'لا أفهم',
  '?', 'huh', 'what',
];

export function mightBeConfused(text: string): boolean {
  const lower = text.toLowerCase();
  return CONFUSION_PHRASES.some(phrase => lower.includes(phrase));
}

export function isLowConfidence(confidence: number): boolean {
  return confidence < config.translation.confidenceThreshold;
}

export async function handleLowConfidence(params: {
  originalText: string;
  sourceLanguage: string;
  targetLanguage: string;
  targetDialect?: string;
  senderProfile?: string;
  receiverProfile?: string;
  conversationContext?: string;
}): Promise<TranslationResult> {
  return retranslateWithMoreContext(params);
}

// Analyze style fingerprint from user's messages over time
export function analyzeStyle(text: string): {
  usesSlang: boolean;
  usesEmoji: boolean;
  casingStyle: string;
  punctuationStyle: string;
  averageLength: number;
} {
  const hasEmoji = /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u.test(text);
  const isAllLower = text === text.toLowerCase() && /[a-z]/.test(text);
  const isAllUpper = text === text.toUpperCase() && /[A-Z]/.test(text);
  const hasSlang = /\b(lol|lmao|bruh|ngl|tbh|idk|omg|smh|fr|ong|nah|yall|gonna|wanna|gotta|ain't|kinda|sorta)\b/i.test(text);
  const hasNoPunctuation = !/[.!?,;:]/.test(text);

  return {
    usesSlang: hasSlang,
    usesEmoji: hasEmoji,
    casingStyle: isAllLower ? 'lowercase' : isAllUpper ? 'uppercase' : 'normal',
    punctuationStyle: hasNoPunctuation ? 'minimal' : 'standard',
    averageLength: text.length,
  };
}
