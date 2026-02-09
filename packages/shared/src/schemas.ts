import { z } from 'zod';

export const DateRangeSchema = z.object({
  dateFrom: z.union([z.date(), z.string()]).transform((val) => new Date(val)),
  dateTo: z.union([z.date(), z.string()]).transform((val) => new Date(val)),
  preset: z.enum(['7d', '28d', '90d', '365d', 'custom'])
});

export const ReportModeSchema = z.enum(['quick', 'standard', 'max']);

export const GenerateReportSchema = z.object({
  range: DateRangeSchema,
  mode: ReportModeSchema
});

export const ProfileCreateSchema = z.object({
  name: z.string().min(1).max(50),
  channelId: z.string().min(1).max(50) // Basic length check
});

export const TranscriptSaveSchema = z.object({
  videoId: z.string().min(1),
  content: z.string(),
  format: z.string()
});

export const ImportCsvSchema = z.object({
  content: z.string(),
  mapping: z.object({
    dateCol: z.number().or(z.string()),
    metricCol: z.number().or(z.string()),
    videoIdCol: z.number().or(z.string()).optional()
  })
});

export const SearchQuerySchema = z.string().max(100); // Prevent huge search queries
