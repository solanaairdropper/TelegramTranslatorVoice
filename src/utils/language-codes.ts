export interface LanguageInfo {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
  dialects?: string[];
}

export const LANGUAGES: LanguageInfo[] = [
  { code: 'en', name: 'English', nativeName: 'English', flag: '\u{1F1FA}\u{1F1F8}', dialects: ['American', 'British', 'Australian'] },
  { code: 'es', name: 'Spanish', nativeName: 'Espa\u00f1ol', flag: '\u{1F1EA}\u{1F1F8}', dialects: ['Latin American', 'Castilian'] },
  { code: 'fr', name: 'French', nativeName: 'Fran\u00e7ais', flag: '\u{1F1EB}\u{1F1F7}', dialects: ['Metropolitan', 'Canadian', 'African'] },
  { code: 'de', name: 'German', nativeName: 'Deutsch', flag: '\u{1F1E9}\u{1F1EA}', dialects: ['Standard', 'Austrian', 'Swiss'] },
  { code: 'it', name: 'Italian', nativeName: 'Italiano', flag: '\u{1F1EE}\u{1F1F9}' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Portugu\u00eas', flag: '\u{1F1E7}\u{1F1F7}', dialects: ['Brazilian', 'European'] },
  { code: 'ru', name: 'Russian', nativeName: '\u0420\u0443\u0441\u0441\u043A\u0438\u0439', flag: '\u{1F1F7}\u{1F1FA}' },
  { code: 'zh', name: 'Chinese', nativeName: '\u4E2D\u6587', flag: '\u{1F1E8}\u{1F1F3}', dialects: ['Simplified', 'Traditional'] },
  { code: 'ja', name: 'Japanese', nativeName: '\u65E5\u672C\u8A9E', flag: '\u{1F1EF}\u{1F1F5}' },
  { code: 'ko', name: 'Korean', nativeName: '\uD55C\uAD6D\uC5B4', flag: '\u{1F1F0}\u{1F1F7}' },
  { code: 'ar', name: 'Arabic', nativeName: '\u0627\u0644\u0639\u0631\u0628\u064A\u0629', flag: '\u{1F1F8}\u{1F1E6}', dialects: ['Modern Standard', 'Egyptian', 'Levantine', 'Gulf'] },
  { code: 'hi', name: 'Hindi', nativeName: '\u0939\u093F\u0928\u094D\u0926\u0940', flag: '\u{1F1EE}\u{1F1F3}' },
  { code: 'tr', name: 'Turkish', nativeName: 'T\u00fcrk\u00e7e', flag: '\u{1F1F9}\u{1F1F7}' },
  { code: 'pl', name: 'Polish', nativeName: 'Polski', flag: '\u{1F1F5}\u{1F1F1}' },
  { code: 'nl', name: 'Dutch', nativeName: 'Nederlands', flag: '\u{1F1F3}\u{1F1F1}' },
  { code: 'uk', name: 'Ukrainian', nativeName: '\u0423\u043A\u0440\u0430\u0457\u043D\u0441\u044C\u043A\u0430', flag: '\u{1F1FA}\u{1F1E6}' },
  { code: 'sv', name: 'Swedish', nativeName: 'Svenska', flag: '\u{1F1F8}\u{1F1EA}' },
  { code: 'he', name: 'Hebrew', nativeName: '\u05E2\u05D1\u05E8\u05D9\u05EA', flag: '\u{1F1EE}\u{1F1F1}' },
  { code: 'th', name: 'Thai', nativeName: '\u0E44\u0E17\u0E22', flag: '\u{1F1F9}\u{1F1ED}' },
  { code: 'vi', name: 'Vietnamese', nativeName: 'Ti\u1EBFng Vi\u1EC7t', flag: '\u{1F1FB}\u{1F1F3}' },
  { code: 'id', name: 'Indonesian', nativeName: 'Bahasa Indonesia', flag: '\u{1F1EE}\u{1F1E9}' },
  { code: 'fil', name: 'Filipino', nativeName: 'Filipino', flag: '\u{1F1F5}\u{1F1ED}' },
  { code: 'ro', name: 'Romanian', nativeName: 'Rom\u00e2n\u0103', flag: '\u{1F1F7}\u{1F1F4}' },
  { code: 'cs', name: 'Czech', nativeName: '\u010Ce\u0161tina', flag: '\u{1F1E8}\u{1F1FF}' },
];

export function getLanguage(code: string): LanguageInfo | undefined {
  return LANGUAGES.find(l => l.code === code);
}

export function getLanguageByName(name: string): LanguageInfo | undefined {
  const lower = name.toLowerCase();
  return LANGUAGES.find(l =>
    l.name.toLowerCase() === lower ||
    l.nativeName.toLowerCase() === lower
  );
}

// Split languages into pages for inline keyboard (3 columns, 3 rows per page = 9)
export function getLanguagePages(pageSize = 9): LanguageInfo[][] {
  const pages: LanguageInfo[][] = [];
  for (let i = 0; i < LANGUAGES.length; i += pageSize) {
    pages.push(LANGUAGES.slice(i, i + pageSize));
  }
  return pages;
}
