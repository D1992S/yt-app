import fs from 'fs';
import path from 'path';
import { repo } from '@insight/core';
import { getAppPaths } from './fs-utils';
import { generateReport } from './report-service';

export const createWeeklyPackage = async () => {
  const paths = getAppPaths();
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const exportDir = path.join(paths.exports, `weekly_package_${timestamp}`);
  
  if (!fs.existsSync(exportDir)) {
    fs.mkdirSync(exportDir, { recursive: true });
  }

  // 1. Generate PDF Report (Standard 7d)
  const range = {
    dateFrom: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    dateTo: new Date(),
    preset: '7d' as const
  };
  const pdfPath = await generateReport(range, 'max');
  const pdfDest = path.join(exportDir, 'report_max.pdf');
  fs.copyFileSync(pdfPath, pdfDest);

  // 2. Generate CSVs
  // Top Videos
  const videos = repo.getQualityScores(50);
  const csvContent = [
    'Video ID,Title,Score,Velocity,Efficiency',
    ...videos.map((v: any) => `${v.video_id},"${v.title}",${v.score},${v.velocity_score},${v.efficiency_score}`)
  ].join('\n');
  fs.writeFileSync(path.join(exportDir, 'top_videos.csv'), csvContent);

  // 3. Summary Text
  const alerts = repo.getUnreadAlerts();
  const summary = `
WEEKLY SUMMARY
Generated: ${new Date().toLocaleString()}

ALERTS:
${alerts.map((a: any) => `- [${a.severity}] ${a.message}`).join('\n')}

TOP VIDEOS:
${videos.slice(0, 5).map((v: any) => `- ${v.title} (Score: ${v.score.toFixed(0)})`).join('\n')}
  `.trim();
  fs.writeFileSync(path.join(exportDir, 'summary.txt'), summary);

  // Log
  repo.logExport(exportDir, 'weekly_package');

  return exportDir;
};
