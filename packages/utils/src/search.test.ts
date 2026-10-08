import { describe, expect, it } from 'vitest';
import {
  buildSearchTokens,
  MAX_PREFIX_LENGTH,
  normalizeSearchText,
  searchQueryToken,
  searchWords,
} from './search';

describe('normalizeSearchText', () => {
  it('lowercases', () => {
    expect(normalizeSearchText('KOYLAK')).toBe('koylak');
  });

  it('strips the several apostrophes Uzbek is written with', () => {
    // A shopper types a plain letter; the catalogue may hold ʻ, ‘ or ’.
    for (const apostrophe of ['ʻ', '‘', '’', "'", '`']) {
      expect(normalizeSearchText(`ko${apostrophe}ylak`)).toBe('koylak');
    }
  });

  it('collapses punctuation and whitespace to single spaces', () => {
    expect(normalizeSearchText('  Bolalar   kiyimi / 2026!  ')).toBe('bolalar kiyimi 2026');
  });

  it('keeps Cyrillic letters and digits', () => {
    expect(normalizeSearchText('Шапка 42')).toBe('шапка 42');
  });

  it('returns empty for punctuation-only input', () => {
    expect(normalizeSearchText('!!!')).toBe('');
    expect(normalizeSearchText('')).toBe('');
  });
});

describe('searchWords', () => {
  it('splits into words', () => {
    expect(searchWords('Koʻylak uzun')).toEqual(['koylak', 'uzun']);
  });

  it('returns an empty array for blank input, not an array holding one blank', () => {
    expect(searchWords('')).toEqual([]);
    expect(searchWords('   ')).toEqual([]);
  });
});

describe('buildSearchTokens', () => {
  const name = { uz: 'Koʻylak', en: 'Dress', ru: 'Платье' };

  it('covers every locale', () => {
    const tokens = buildSearchTokens(name);
    expect(tokens).toContain('koylak');
    expect(tokens).toContain('dress');
    expect(tokens).toContain('платье');
  });

  it('stores word prefixes so partial typing matches', () => {
    const tokens = buildSearchTokens(name);
    expect(tokens).toContain('ko');
    expect(tokens).toContain('koy');
    expect(tokens).toContain('koyl');
  });

  it('does not store single-letter prefixes of longer words', () => {
    // 'k' would match a large share of the catalogue — useless as a filter.
    expect(buildSearchTokens(name)).not.toContain('k');
  });

  it('indexes each word of a multi-word name separately', () => {
    const tokens = buildSearchTokens({ uz: 'Qishki kurtka' });
    expect(tokens).toContain('qishki');
    expect(tokens).toContain('kurtka');
    expect(tokens).toContain('ku');
  });

  it('caps prefix length so a long word cannot bloat the document', () => {
    const tokens = buildSearchTokens({ uz: 'supercalifragilistic' });
    expect(tokens.every((tok) => tok.length <= MAX_PREFIX_LENGTH)).toBe(true);
  });

  it('deduplicates across locales and repeated words', () => {
    const tokens = buildSearchTokens({ uz: 'Dress dress', en: 'Dress' });
    expect(new Set(tokens).size).toBe(tokens.length);
  });

  it('merges several fields', () => {
    const tokens = buildSearchTokens({ uz: 'Koylak' }, { uz: 'Paxta' });
    expect(tokens).toContain('koylak');
    expect(tokens).toContain('paxta');
  });

  it('tolerates missing input', () => {
    expect(buildSearchTokens(undefined)).toEqual([]);
    expect(buildSearchTokens({ uz: '' })).toEqual([]);
  });

  it('keeps a one-letter word searchable', () => {
    expect(buildSearchTokens({ uz: 'M size' })).toContain('m');
  });
});

describe('searchQueryToken', () => {
  it('normalizes the query the same way as stored tokens', () => {
    expect(searchQueryToken('Koʻylak')).toBe('koylak');
  });

  it('picks the longest word — the most selective one', () => {
    expect(searchQueryToken('uzun koylakcha')).toBe('koylakcha');
  });

  it('truncates to the stored prefix cap so a long query still matches', () => {
    const word = 'supercalifragilistic';
    expect(searchQueryToken(word)).toBe(word.slice(0, MAX_PREFIX_LENGTH));
    // And that truncated token is exactly what a matching product stores.
    expect(buildSearchTokens({ uz: word })).toContain(word.slice(0, MAX_PREFIX_LENGTH));
  });

  it('returns null for a blank query so callers skip the filter', () => {
    expect(searchQueryToken('')).toBeNull();
    expect(searchQueryToken('   ')).toBeNull();
    expect(searchQueryToken('!!!')).toBeNull();
  });

  it('round-trips: a query token is present in the tokens of a matching name', () => {
    const tokens = buildSearchTokens({ uz: 'Koʻylak uzun' });
    for (const query of ['ko', 'koy', 'koylak', 'KOYLAK', 'uz', 'uzun']) {
      const token = searchQueryToken(query);
      expect(token, query).not.toBeNull();
      expect(tokens, query).toContain(token);
    }
  });
});
