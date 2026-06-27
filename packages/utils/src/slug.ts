const TRANSLIT: Record<string, string> = {
  ʻ: '',
  '‘': '',
  '’': '',
  қ: 'q',
  ғ: 'g',
  ҳ: 'h',
  ў: 'o',
  ш: 'sh',
  ч: 'ch',
  ё: 'yo',
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
