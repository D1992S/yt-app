import { QueryPlan, getRangeFromPreset, formatDateISO } from '@insight/shared';
import { repo } from '../db/repo';
import { getDb } from '../db/client';

export class CoreDataExecutor {
  async executePlan(plan: QueryPlan): Promise<any> {
    const db = getDb();
    const limit = plan.filters?.limit || 10;
    
    // Date Range Logic
    let range = { start: new Date(), end: new Date() };
    if (plan.filters?.date_range && plan.filters.date_range !== 'all') {
      range = getRangeFromPreset(plan.filters.date_range);
    } else {
      range = getRangeFromPreset('last_28d'); // Default
    }

    const startStr = formatDateISO(range.start);
    const endStr = formatDateISO(range.end);

    if (plan.intent === 'list_videos') {
      // Fetch top videos by views in range
      return db.prepare(`
        SELECT v.title, SUM(f.views) as total_views, SUM(f.watch_time_minutes) as total_watch_time
        FROM fact_video_day f
        JOIN dim_video v ON f.video_id = v.video_id
        WHERE f.day >= ? AND f.day <= ?
        GROUP BY v.video_id
        ORDER BY total_views DESC
        LIMIT ?
      `).all(startStr, endStr, limit);
    }

    if (plan.intent === 'analytics') {
      if (plan.dimension === 'day') {
        // Daily aggregation
        return db.prepare(`
          SELECT day, SUM(views) as views, SUM(watch_time_minutes) as watch_time
          FROM fact_channel_day
          WHERE day >= ? AND day <= ?
          GROUP BY day
          ORDER BY day ASC
        `).all(startStr, endStr);
      } else {
        // Total aggregation
        return db.prepare(`
          SELECT SUM(views) as total_views, SUM(watch_time_minutes) as total_watch_time, 
                 SUM(subs_gained) as subs_gained
          FROM fact_channel_day
          WHERE day >= ? AND day <= ?
        `).get(startStr, endStr);
      }
    }

    return { message: "No data found for this intent." };
  }
}
