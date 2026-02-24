import { MenuCache } from '../db/models/menu-cache.js';
import { chatCompletionJSON } from '../ai/client.js';
import { UI_STRINGS, StringKey, LOADING_KEYS } from './strings.js';

// In-memory cache: langCode → (key → translated string)
const cache = new Map<string, Record<string, string>>();

// Prevents duplicate in-flight translation requests for the same language
const inFlight = new Map<string, Promise<void>>();

// ── Load all cached translations from DB on startup ──

export async function initI18n(): Promise<void> {
  const docs = await MenuCache.find({});
  for (const doc of docs) {
    const map: Record<string, string> = {};
    doc.translations.forEach((val: string, key: string) => {
      map[key] = val;
    });
    cache.set(doc.language, map);
  }
  console.log(`i18n: loaded ${docs.length} cached language(s)`);
}

// ── Core lookup: get translated string with variable substitution ──

export function t(langCode: string | undefined, key: StringKey, vars?: Record<string, string>): string {
  const english = UI_STRINGS[key];

  // English or no language — use defaults
  if (!langCode || langCode === 'en') {
    return vars ? interpolate(english, vars) : english;
  }

  const langStrings = cache.get(langCode);
  const translated = langStrings?.[key] ?? english;
  return vars ? interpolate(translated, vars) : translated;
}

// ── Loading text helper ──

export function getLoadingText(langCode?: string): string {
  const key = LOADING_KEYS[Math.floor(Math.random() * LOADING_KEYS.length)];
  return `\u23F3 <i>${t(langCode, key)}</i>`;
}

// ── Translated timeAgo ──

export function timeAgo(date: Date, langCode?: string): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return t(langCode, 'time_just_now');
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return t(langCode, 'time_min_ago', { n: String(minutes) });
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return t(langCode, 'time_hour_ago', { n: String(hours) });
  const days = Math.floor(hours / 24);
  return t(langCode, 'time_day_ago', { n: String(days) });
}

// ── Ensure a language's translations are cached (translate if not) ──

export function ensureLanguageStrings(langCode: string, languageName: string): Promise<void> {
  if (langCode === 'en' || cache.has(langCode)) return Promise.resolve();

  const existing = inFlight.get(langCode);
  if (existing) return existing;

  const promise = translateAndCache(langCode, languageName).finally(() => {
    inFlight.delete(langCode);
  });
  inFlight.set(langCode, promise);
  return promise;
}

// ── Internal: batch-translate all strings and persist ──

const BATCH_SYSTEM = `You are translating ALL user interface text for a Telegram messenger bot into the target language.

ABSOLUTE RULES:
- Translate every JSON value naturally into the target language
- Button labels (keys starting with "btn_") MUST be very short — 1 to 3 words maximum
- Preserve ALL {placeholder} tokens EXACTLY as-is (e.g., {name}, {lang}, {code}, {n})
- Preserve ALL HTML tags EXACTLY as-is (<b>, </b>, <i>, </i>, <code>, </code>)
- Preserve ALL emoji EXACTLY as-is
- Preserve \\n newlines EXACTLY as-is
- Output ONLY valid JSON with the exact same keys as the input
- Do NOT add explanations, comments, or extra text outside the JSON
- Translate the VALUES only, never the keys`;

async function translateAndCache(langCode: string, languageName: string): Promise<void> {
  const inputObj: Record<string, string> = {};
  for (const [key, val] of Object.entries(UI_STRINGS)) {
    inputObj[key] = val;
  }

  const userPrompt = `Translate all values to ${languageName}.\n\n${JSON.stringify(inputObj, null, 2)}`;

  try {
    const result = await chatCompletionJSON<Record<string, string>>(
      BATCH_SYSTEM,
      userPrompt,
      { temperature: 0.1, maxTokens: 4000 }
    );

    // Validate: only accept keys that exist in UI_STRINGS
    const validated: Record<string, string> = {};
    for (const key of Object.keys(UI_STRINGS)) {
      if (result[key] && typeof result[key] === 'string') {
        validated[key] = result[key];
      }
    }

    // Store in memory
    cache.set(langCode, validated);

    // Persist to MongoDB
    const translations = new Map<string, string>();
    for (const [k, v] of Object.entries(validated)) {
      translations.set(k, v);
    }
    await MenuCache.findOneAndUpdate(
      { language: langCode },
      { $set: { translations, updatedAt: new Date() } },
      { upsert: true }
    );

    console.log(`i18n: translated ${Object.keys(validated).length} strings for ${languageName} (${langCode})`);
  } catch (err) {
    console.error(`i18n: failed to translate for ${languageName} (${langCode}):`, err);
    // Fallback: English will be used via t()
  }
}

// ── Variable interpolation ──

function interpolate(str: string, vars: Record<string, string>): string {
  return str.replace(/\{(\w+)\}/g, (_, key) => vars[key] ?? `{${key}}`);
}
