import { describe, expect, it } from 'vitest';
import {
  IMAGE_ENCODE_STEPS,
  INLINE_IMAGE_MAX_BYTES,
  INLINE_IMAGE_MAX_DATA_URL_CHARS,
  ImageTooLargeError,
  encodeWithinBudget,
  fitWithin,
  inlineImageRef,
  parseInlineImageRef,
} from './image';

describe('encodeWithinBudget', () => {
  it('returns the first step that fits, without trying the rest', async () => {
    const tried: number[] = [];
    const result = await encodeWithinBudget(async (step) => {
      tried.push(step.quality);
      return { size: step.quality > 0.7 ? 500_000 : 200_000, step };
    });
    expect(tried).toEqual([0.8, 0.65]);
    expect(result.step).toEqual(IMAGE_ENCODE_STEPS[1]);
  });

  it('throws ImageTooLargeError when even the smallest step is over budget', async () => {
    await expect(encodeWithinBudget(async () => ({ size: 999_999 }))).rejects.toBeInstanceOf(
      ImageTooLargeError,
    );
  });

  it('keeps the byte budget consistent with the rules data-URL cap', () => {
    const base64 = Math.ceil(INLINE_IMAGE_MAX_BYTES / 3) * 4;
    expect(base64 + 'data:image/jpeg;base64,'.length).toBeLessThanOrEqual(
      INLINE_IMAGE_MAX_DATA_URL_CHARS,
    );
    expect(INLINE_IMAGE_MAX_DATA_URL_CHARS).toBeLessThan(1_048_576 - 4_096);
  });
});

describe('fitWithin', () => {
  it('scales the longest side down and keeps the ratio', () => {
    expect(fitWithin(4000, 3000, 1080)).toEqual({ width: 1080, height: 810 });
    expect(fitWithin(3000, 4000, 1080)).toEqual({ width: 810, height: 1080 });
  });

  it('never upscales', () => {
    expect(fitWithin(500, 400, 1080)).toEqual({ width: 500, height: 400 });
  });
});

describe('inline image refs', () => {
  it('round-trips an id', () => {
    expect(parseInlineImageRef(inlineImageRef('abc123'))).toBe('abc123');
  });

  it('treats plain URLs and malformed refs as not inline', () => {
    expect(parseInlineImageRef('https://picsum.photos/seed/x/800')).toBeNull();
    expect(parseInlineImageRef('kwimg:')).toBeNull();
    expect(parseInlineImageRef('kwimg:a/b')).toBeNull();
  });
});
