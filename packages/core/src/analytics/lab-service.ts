import { repo } from '../db/repo';
import { formatDateISO, addDays } from '@insight/shared';

export const analyzeStyles = () => {
  const startDay = formatDateISO(addDays(new Date(), -7));
  const data = repo.getVideoMetricsWithTags(startDay) as any[];
  
  const styleStats = new Map<string, { count: number; totalViews: number }>();

  data.forEach(row => {
    if (!row.style_tags) return;
    const tags = JSON.parse(row.style_tags);
    const views = row.views_7d || 0;

    tags.forEach((tag: string) => {
      if (!styleStats.has(tag)) styleStats.set(tag, { count: 0, totalViews: 0 });
      const stat = styleStats.get(tag)!;
      stat.count++;
      stat.totalViews += views;
    });
  });

  return Array.from(styleStats.entries()).map(([tag, stat]) => ({
    tag,
    count: stat.count,
    avgViews7d: stat.count > 0 ? Math.round(stat.totalViews / stat.count) : 0
  })).sort((a, b) => b.avgViews7d - a.avgViews7d);
};
