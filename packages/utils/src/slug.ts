// Full Cyrillic coverage, not just the Uzbek-specific letters: `name.uz` is
// routinely typed in Cyrillic Uzbek, and an unmapped letter is not [a-z0-9], so
// it would collapse to a dash and get trimmed — "шапка" once slugged to "sh".
const TRANSLIT: Record<string, string> = {
  ʻ: '',
  '‘': '',
  '’': '',
  // Uzbek Cyrillic extras
  қ: 'q',
  ғ: 'g',
  ҳ: 'h',
  ў: 'o',
  // Common Cyrillic
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
  х: 'h',
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
};

/**
 * Builds a URL-safe slug from arbitrary (uz/en/ru) text: lowercases, applies a
 * small Uzbek transliteration map, then collapses anything non-alphanumeric to
 * single dashes. Deterministic and dependency-free so both platforms share it.
 */
export function slugify(input: string): string {
  const lowered = input.toLowerCase().trim();
  const translit = [...lowered].map((ch) => TRANSLIT[ch] ?? ch).join('');
  return translit
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
