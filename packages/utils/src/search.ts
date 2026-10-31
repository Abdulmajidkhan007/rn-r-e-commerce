import type { LocalizedLike } from './localized';

/**
 * Search tokens for server-side catalog search.
 *
 * Firestore has no substring or full-text operator, so matching has to be done
 * against a denormalized array with `array-contains`. Each product stores every
 * word prefix of every localized name; a query is then a single indexed lookup
 * regardless of catalog size, instead of downloading the collection and
 * filtering in memory.
 *
 * Cyrillic is transliterated to Uzbek Latin on both sides (stored tokens and the
 * query), so "куртка" finds a product named "Kurtka" and vice versa.
 *
 * The trade-off is deliberate: this matches word *prefixes* ("koy" finds
 * "koʻylak"), not arbitrary infixes ("ylak" does not). Real infix search needs a
 * dedicated engine (Algolia/Typesense); prefixes are what a shopper actually
 * types.
 */

/** Longest prefix stored per word. Caps the array for very long words. */
export const MAX_PREFIX_LENGTH = 12;

/** Shortest prefix stored. One-letter prefixes would match almost everything. */
export const MIN_PREFIX_LENGTH = 2;

/**
 * Cyrillic → Uzbek Latin. Uzbek-specific letters (ў қ ғ ҳ) map to the plain
 * Latin letter once apostrophes are stripped (ў → o', ғ → g' → "o", "g"), the
 * same form a shopper types. Hard/soft signs are dropped.
 */
const CYRILLIC_TO_LATIN: Readonly<Record<string, string>> = {
  а: 'a',
  б: 'b',
  в: 'v',
  г: 'g',
  д: 'd',
  е: 'e',
  ё: 'yo',
  ж: 'j',
  з: 'z',
  и: 'i',
  й: 'y',
  к: 'k',
  л: 'l',
  м: 'm',
  н: 'n',
  о: 'o',
  п: 'p',
  р: 'r',
  с: 's',
  т: 't',
  у: 'u',
  ф: 'f',
  х: 'x',
  ц: 'ts',
  ч: 'ch',
  ш: 'sh',
  щ: 'sh',
  ъ: '',
  ы: 'i',
  ь: '',
  э: 'e',
  ю: 'yu',
  я: 'ya',
  ў: 'o',
  қ: 'q',
  ғ: 'g',
  ҳ: 'h',
};

/** Transliterates (already lowercased) Cyrillic text to Uzbek Latin; other characters pass through. */
export function cyrillicToLatin(input: string): string {
  let out = '';
  for (const ch of input) out += CYRILLIC_TO_LATIN[ch] ?? ch;
  return out;
}

/**
 * Lowercases, transliterates Cyrillic to Latin and strips the punctuation that
 * varies between how a name is written and how it is typed — Uzbek apostrophes
 * especially, which appear as several different Unicode characters (ʻ ʼ ‘ ’ ´ ′ ` ').
 * Stripping (rather than keeping ') makes "ko'ylak", "koʻylak" and "koylak" one search.
 */
export function normalizeSearchText(input: string): string {
  return cyrillicToLatin(input.toLowerCase().normalize('NFC'))
    .replace(/[ʻʼʹ‘’′´`']/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

/** Splits normalized text into searchable words. */
export function searchWords(input: string): string[] {
  const normalized = normalizeSearchText(input);
  return normalized ? normalized.split(' ').filter(Boolean) : [];
}

/**
 * Every prefix of every word across all locales, deduplicated.
 *
 * Stored on the product document by the admin mutations, so it must stay
 * deterministic — a change here needs a backfill of existing products
 * (`scripts/backfill-search-tokens.ts`).
 */
export function buildSearchTokens(...texts: (LocalizedLike | undefined)[]): string[] {
  const tokens = new Set<string>();

  for (const text of texts) {
    if (!text) continue;
    for (const value of [text.uz, text.en, text.ru]) {
      if (!value) continue;
      for (const word of searchWords(value)) {
        const limit = Math.min(word.length, MAX_PREFIX_LENGTH);
        for (let len = MIN_PREFIX_LENGTH; len <= limit; len++) {
          tokens.add(word.slice(0, len));
        }
        // Keep single-character words searchable on their own.
        if (word.length < MIN_PREFIX_LENGTH) tokens.add(word);
      }
    }
  }

  return [...tokens];
}

/**
 * Turns a user's query into the single token to look up.
 *
 * Firestore's `array-contains` takes one value, so the longest word is used —
 * the most selective one. Longer than MAX_PREFIX_LENGTH is truncated to match
 * what was actually stored.
 */
export function searchQueryToken(query: string): string | null {
  const words = searchWords(query);
  if (words.length === 0) return null;

  const longest = words.reduce((a, b) => (b.length > a.length ? b : a));
  return longest.slice(0, MAX_PREFIX_LENGTH);
}
