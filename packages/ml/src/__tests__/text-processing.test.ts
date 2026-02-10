import { describe, it, expect } from 'vitest';
import { cleanText, getTopWords, calculateSimilarity } from '../text-processing';

describe('cleanText', () => {
  it('removes English stopwords', () => {
    const result = cleanText('the quick brown fox and the lazy dog');
    expect(result).not.toContain('the');
    expect(result).not.toContain('and');
    expect(result).toContain('quick');
    expect(result).toContain('brown');
    expect(result).toContain('fox');
    expect(result).toContain('lazy');
    expect(result).toContain('dog');
  });

  it('removes Polish stopwords', () => {
    const result = cleanText('jak robić coś dla siebie tam');
    expect(result).not.toContain('jak');
    expect(result).not.toContain('dla');
    expect(result).not.toContain('tam');
  });

  it('lowercases all text', () => {
    const result = cleanText('HELLO World MiXeD');
    result.forEach(word => {
      expect(word).toBe(word.toLowerCase());
    });
  });

  it('removes words with 2 or fewer characters', () => {
    const result = cleanText('go do it no we he');
    // All of these are <= 2 chars or stopwords
    result.forEach(word => {
      expect(word.length).toBeGreaterThan(2);
    });
  });

  it('removes punctuation and special characters', () => {
    const result = cleanText('hello! world? testing... #hashtag @mention');
    expect(result).toContain('hello');
    expect(result).toContain('world');
    expect(result).toContain('testing');
    expect(result).toContain('hashtag');
    expect(result).toContain('mention');
    // No punctuation should remain
    result.forEach(word => {
      expect(word).toMatch(/^[\p{L}]+$/u);
    });
  });

  it('handles unicode characters (preserves letters from other scripts)', () => {
    const result = cleanText('programowanie jest super');
    // 'jest' is a Polish stopword, should be removed
    expect(result).not.toContain('jest');
    expect(result).toContain('programowanie');
    expect(result).toContain('super');
  });

  it('handles numbers by removing them', () => {
    const result = cleanText('top 10 best moments 2024');
    // Numbers are removed by the regex [^\p{L}\s]
    expect(result).not.toContain('10');
    expect(result).not.toContain('2024');
    expect(result).toContain('top');
    expect(result).toContain('best');
    expect(result).toContain('moments');
  });

  it('handles empty string', () => {
    const result = cleanText('');
    expect(result).toEqual([]);
  });

  it('handles string with only stopwords and short words', () => {
    const result = cleanText('the a an is are it we');
    expect(result).toEqual([]);
  });

  it('removes "video" and "vlog" as stopwords', () => {
    const result = cleanText('my video about vlog life daily');
    expect(result).not.toContain('video');
    expect(result).not.toContain('vlog');
    expect(result).toContain('life');
    expect(result).toContain('daily');
  });
});

describe('getTopWords', () => {
  it('returns the top N most frequent words', () => {
    const texts = [
      'python tutorial beginner python',
      'python advanced tutorial tips',
      'javascript tutorial react beginner',
    ];

    const result = getTopWords(texts, 3);
    const words = result.split(', ');

    expect(words).toHaveLength(3);
    // "python" appears 3 times (most frequent), "tutorial" 3 times, "beginner" 2 times
    expect(words[0]).toBe('python');
    expect(words).toContain('tutorial');
  });

  it('returns empty string for empty input', () => {
    expect(getTopWords([])).toBe('');
  });

  it('returns empty string when all texts are stopwords', () => {
    const texts = ['the a an is are', 'it we they he she'];
    expect(getTopWords(texts)).toBe('');
  });

  it('defaults to top 3 when topN is not specified', () => {
    const texts = [
      'alpha beta gamma delta epsilon',
      'alpha beta gamma delta',
      'alpha beta gamma',
    ];

    const result = getTopWords(texts);
    const words = result.split(', ');
    expect(words).toHaveLength(3);
  });

  it('returns fewer words if vocabulary is smaller than topN', () => {
    const texts = ['hello world'];
    const result = getTopWords(texts, 10);
    const words = result.split(', ').filter(w => w.length > 0);
    expect(words.length).toBeLessThanOrEqual(2);
  });

  it('handles topN = 1', () => {
    const texts = ['alpha alpha alpha', 'beta beta', 'alpha'];
    const result = getTopWords(texts, 1);
    expect(result).toBe('alpha');
  });
});

describe('calculateSimilarity', () => {
  it('returns 1 for identical texts', () => {
    const text = 'machine learning tutorial python';
    expect(calculateSimilarity(text, text)).toBe(1);
  });

  it('returns 0 for completely different texts (no token overlap)', () => {
    const text1 = 'python programming tutorial';
    const text2 = 'cooking recipe kitchen';
    expect(calculateSimilarity(text1, text2)).toBe(0);
  });

  it('returns a value between 0 and 1 for partially overlapping texts', () => {
    const text1 = 'python programming tutorial beginner';
    const text2 = 'python advanced tutorial expert';

    const sim = calculateSimilarity(text1, text2);
    expect(sim).toBeGreaterThan(0);
    expect(sim).toBeLessThan(1);
  });

  it('returns 0 when one text is empty', () => {
    expect(calculateSimilarity('', 'something interesting')).toBe(0);
    expect(calculateSimilarity('hello world testing', '')).toBe(0);
  });

  it('returns 0 when both texts are empty', () => {
    expect(calculateSimilarity('', '')).toBe(0);
  });

  it('returns 0 when texts contain only stopwords', () => {
    expect(calculateSimilarity('the a an', 'is are was')).toBe(0);
  });

  it('is symmetric: similarity(a, b) == similarity(b, a)', () => {
    const text1 = 'python machine learning basics';
    const text2 = 'machine learning advanced topics';

    expect(calculateSimilarity(text1, text2)).toBe(calculateSimilarity(text2, text1));
  });

  it('computes Jaccard similarity correctly', () => {
    // text1 tokens after cleaning: ["python", "machine", "learning"]
    // text2 tokens after cleaning: ["machine", "learning", "deep"]
    // intersection: {"machine", "learning"} => size 2
    // union: {"python", "machine", "learning", "deep"} => size 4
    // Jaccard = 2/4 = 0.5
    const text1 = 'python machine learning';
    const text2 = 'machine learning deep';

    expect(calculateSimilarity(text1, text2)).toBeCloseTo(0.5, 5);
  });

  it('is case-insensitive', () => {
    expect(calculateSimilarity('Python Machine Learning', 'python machine learning')).toBe(1);
  });
});
