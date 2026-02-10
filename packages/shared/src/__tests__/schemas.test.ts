import { describe, it, expect } from 'vitest';
import {
  DateRangeSchema,
  ReportModeSchema,
  GenerateReportSchema,
  ProfileCreateSchema,
  SearchQuerySchema,
} from '../schemas';

describe('DateRangeSchema', () => {
  it('accepts valid string dates with a valid preset', () => {
    const input = {
      dateFrom: '2024-01-01',
      dateTo: '2024-01-31',
      preset: '28d',
    };
    const result = DateRangeSchema.parse(input);
    expect(result.dateFrom).toBeInstanceOf(Date);
    expect(result.dateTo).toBeInstanceOf(Date);
    expect(result.preset).toBe('28d');
  });

  it('accepts Date objects', () => {
    const input = {
      dateFrom: new Date('2024-01-01'),
      dateTo: new Date('2024-01-31'),
      preset: '7d',
    };
    const result = DateRangeSchema.parse(input);
    expect(result.dateFrom).toBeInstanceOf(Date);
    expect(result.dateTo).toBeInstanceOf(Date);
  });

  it('transforms string dates into Date objects', () => {
    const input = {
      dateFrom: '2024-06-15',
      dateTo: '2024-07-15',
      preset: 'custom',
    };
    const result = DateRangeSchema.parse(input);
    expect(result.dateFrom.getFullYear()).toBe(2024);
    expect(result.dateTo.getMonth()).toBe(6); // July = 6 (zero-indexed)
  });

  it('accepts all valid preset values', () => {
    const presets = ['7d', '28d', '90d', '365d', 'custom'] as const;
    for (const preset of presets) {
      const result = DateRangeSchema.parse({
        dateFrom: '2024-01-01',
        dateTo: '2024-01-31',
        preset,
      });
      expect(result.preset).toBe(preset);
    }
  });

  it('rejects an invalid preset', () => {
    const input = {
      dateFrom: '2024-01-01',
      dateTo: '2024-01-31',
      preset: 'invalid',
    };
    expect(() => DateRangeSchema.parse(input)).toThrow();
  });

  it('rejects missing dateFrom', () => {
    const input = {
      dateTo: '2024-01-31',
      preset: '28d',
    };
    expect(() => DateRangeSchema.parse(input)).toThrow();
  });

  it('rejects missing dateTo', () => {
    const input = {
      dateFrom: '2024-01-01',
      preset: '28d',
    };
    expect(() => DateRangeSchema.parse(input)).toThrow();
  });

  it('rejects missing preset', () => {
    const input = {
      dateFrom: '2024-01-01',
      dateTo: '2024-01-31',
    };
    expect(() => DateRangeSchema.parse(input)).toThrow();
  });

  it('rejects numeric values for dates (not in union)', () => {
    const input = {
      dateFrom: 1704067200000,
      dateTo: 1706659200000,
      preset: '28d',
    };
    expect(() => DateRangeSchema.parse(input)).toThrow();
  });
});

describe('ReportModeSchema', () => {
  it('accepts "quick"', () => {
    expect(ReportModeSchema.parse('quick')).toBe('quick');
  });

  it('accepts "standard"', () => {
    expect(ReportModeSchema.parse('standard')).toBe('standard');
  });

  it('accepts "max"', () => {
    expect(ReportModeSchema.parse('max')).toBe('max');
  });

  it('rejects an invalid mode string', () => {
    expect(() => ReportModeSchema.parse('turbo')).toThrow();
  });

  it('rejects an empty string', () => {
    expect(() => ReportModeSchema.parse('')).toThrow();
  });

  it('rejects a number', () => {
    expect(() => ReportModeSchema.parse(1)).toThrow();
  });

  it('rejects null', () => {
    expect(() => ReportModeSchema.parse(null)).toThrow();
  });
});

describe('GenerateReportSchema', () => {
  const validInput = {
    range: {
      dateFrom: '2024-01-01',
      dateTo: '2024-01-31',
      preset: '28d' as const,
    },
    mode: 'standard' as const,
  };

  it('accepts a valid complete input', () => {
    const result = GenerateReportSchema.parse(validInput);
    expect(result.range.dateFrom).toBeInstanceOf(Date);
    expect(result.range.dateTo).toBeInstanceOf(Date);
    expect(result.range.preset).toBe('28d');
    expect(result.mode).toBe('standard');
  });

  it('rejects when range is missing', () => {
    expect(() => GenerateReportSchema.parse({ mode: 'quick' })).toThrow();
  });

  it('rejects when mode is missing', () => {
    expect(() =>
      GenerateReportSchema.parse({
        range: {
          dateFrom: '2024-01-01',
          dateTo: '2024-01-31',
          preset: '28d',
        },
      })
    ).toThrow();
  });

  it('rejects an invalid mode in a complete input', () => {
    expect(() =>
      GenerateReportSchema.parse({
        ...validInput,
        mode: 'extreme',
      })
    ).toThrow();
  });

  it('rejects an invalid preset within the range', () => {
    expect(() =>
      GenerateReportSchema.parse({
        range: {
          dateFrom: '2024-01-01',
          dateTo: '2024-01-31',
          preset: 'yearly',
        },
        mode: 'quick',
      })
    ).toThrow();
  });
});

describe('ProfileCreateSchema', () => {
  it('accepts a valid name and channelId', () => {
    const result = ProfileCreateSchema.parse({
      name: 'My Channel',
      channelId: 'UC1234567890',
    });
    expect(result.name).toBe('My Channel');
    expect(result.channelId).toBe('UC1234567890');
  });

  it('accepts a name at the minimum length (1 character)', () => {
    const result = ProfileCreateSchema.parse({
      name: 'A',
      channelId: 'X',
    });
    expect(result.name).toBe('A');
  });

  it('accepts a name at the maximum length (50 characters)', () => {
    const name = 'A'.repeat(50);
    const result = ProfileCreateSchema.parse({
      name,
      channelId: 'UC123',
    });
    expect(result.name).toBe(name);
  });

  it('rejects an empty name', () => {
    expect(() =>
      ProfileCreateSchema.parse({
        name: '',
        channelId: 'UC123',
      })
    ).toThrow();
  });

  it('rejects a name exceeding 50 characters', () => {
    expect(() =>
      ProfileCreateSchema.parse({
        name: 'A'.repeat(51),
        channelId: 'UC123',
      })
    ).toThrow();
  });

  it('rejects an empty channelId', () => {
    expect(() =>
      ProfileCreateSchema.parse({
        name: 'Valid Name',
        channelId: '',
      })
    ).toThrow();
  });

  it('rejects a channelId exceeding 50 characters', () => {
    expect(() =>
      ProfileCreateSchema.parse({
        name: 'Valid Name',
        channelId: 'C'.repeat(51),
      })
    ).toThrow();
  });

  it('accepts a channelId at the maximum length (50 characters)', () => {
    const channelId = 'C'.repeat(50);
    const result = ProfileCreateSchema.parse({
      name: 'Valid',
      channelId,
    });
    expect(result.channelId).toBe(channelId);
  });

  it('rejects missing name field', () => {
    expect(() =>
      ProfileCreateSchema.parse({
        channelId: 'UC123',
      })
    ).toThrow();
  });

  it('rejects missing channelId field', () => {
    expect(() =>
      ProfileCreateSchema.parse({
        name: 'My Channel',
      })
    ).toThrow();
  });

  it('rejects non-string name', () => {
    expect(() =>
      ProfileCreateSchema.parse({
        name: 123,
        channelId: 'UC123',
      })
    ).toThrow();
  });
});

describe('SearchQuerySchema', () => {
  it('accepts a normal search string', () => {
    expect(SearchQuerySchema.parse('how to edit video')).toBe('how to edit video');
  });

  it('accepts an empty string', () => {
    expect(SearchQuerySchema.parse('')).toBe('');
  });

  it('accepts a string at the maximum length (100 characters)', () => {
    const query = 'q'.repeat(100);
    expect(SearchQuerySchema.parse(query)).toBe(query);
  });

  it('rejects a string exceeding 100 characters', () => {
    const query = 'q'.repeat(101);
    expect(() => SearchQuerySchema.parse(query)).toThrow();
  });

  it('rejects a non-string value (number)', () => {
    expect(() => SearchQuerySchema.parse(42)).toThrow();
  });

  it('rejects null', () => {
    expect(() => SearchQuerySchema.parse(null)).toThrow();
  });

  it('rejects undefined', () => {
    expect(() => SearchQuerySchema.parse(undefined)).toThrow();
  });

  it('accepts strings with special characters', () => {
    const query = 'search: "hello world" & more <stuff>';
    expect(SearchQuerySchema.parse(query)).toBe(query);
  });

  it('accepts unicode strings within the limit', () => {
    const query = 'wyszukiwanie filmow na YouTube';
    expect(SearchQuerySchema.parse(query)).toBe(query);
  });
});
