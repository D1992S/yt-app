import { BrowserWindow, app } from 'electron';
import path from 'path';
import fs from 'fs';
import { repo, calculateMetrics, perf } from '@insight/core';
import { generateHtmlReport, detectAnomalies } from '@insight/reports';
import { ReportData, Range, ReportMode, formatDateISO, getPreviousPeriod } from '@insight/shared';
import { getAppPaths } from './fs-utils';
import { GuardedLLMProvider } from '@insight/core/dist/llm/guard'; 
import { GoogleGenAIProvider, LocalStubProvider, EXECUTIVE_BRIEF_PROMPT } from '@insight/llm';

const apiKey = process.env.API_KEY;
const baseProvider = apiKey ? new GoogleGenAIProvider(apiKey) : new LocalStubProvider();
const llm = new GuardedLLMProvider(baseProvider);

export const generateReport = async (range: Range, mode: ReportMode): Promise<string> => {
  return perf.measure('report_generation_total', async () => {
    const paths = getAppPaths();
    
    const db = require('@insight/core').getDb();
    const channel = db.prepare('SELECT channel_id FROM dim_channel LIMIT 1').get();
    
    if (!channel) throw new Error("No channel data found. Please sync first.");

    const startStr = formatDateISO(range.dateFrom);
    const endStr = formatDateISO(range.dateTo);
    
    const stats = await perf.measure('report_db_fetch', async () => 
      repo.getChannelStats(channel.channel_id, startStr, endStr)
    );
    
    const timeSeries = stats.map((s: any) => ({
      date: s.day,
      value: s.views,
      category: 'Views'
    }));

    const metrics = calculateMetrics(timeSeries);

    // Calculate Previous Period using shared util
    const { start: prevStart, end: prevEnd } = getPreviousPeriod(range.dateFrom, range.dateTo);
    const prevStats = repo.getChannelStats(
      channel.channel_id, 
      formatDateISO(prevStart), 
      formatDateISO(prevEnd)
    );
    const prevTimeSeries = prevStats.map((s: any) => ({ date: s.day, value: s.views, category: 'Views' }));
    const prevMetrics = prevTimeSeries.length > 0 ? calculateMetrics(prevTimeSeries) : null;

    const metricRows = stats.map((s: any) => ({ date: s.day, metric: 'views', value: s.views }));
    const anomalies = detectAnomalies(metricRows, 'views');

    let insights = undefined;
    if (mode === 'max' && apiKey) {
      try {
        const context = {
          metrics,
          prevMetrics,
          anomalies: anomalies.length,
          topVideos: repo.getQualityScores(3).map((v: any) => ({ title: v.title, score: v.score }))
        };
        insights = await llm.generateText(JSON.stringify(context), EXECUTIVE_BRIEF_PROMPT);
      } catch (e) {
        console.warn('Failed to generate executive brief', e);
        insights = '<p><em>AI Brief unavailable.</em></p>';
      }
    }

    const reportData: ReportData = {
      id: crypto.randomUUID().slice(0, 8).toUpperCase(),
      generatedAt: new Date().toISOString(),
      range,
      mode,
      metrics,
      timeSeries,
      isOffline: true,
      insights
    };

    const html = generateHtmlReport(reportData, anomalies, prevMetrics);
    const filename = `report_${reportData.id}.html`;
    const htmlPath = path.join(paths.reports, filename);
    fs.writeFileSync(htmlPath, html);

    const pdfPath = path.join(paths.reports, `report_${reportData.id}.pdf`);
    
    await perf.measure('report_pdf_render', async () => {
      const printWindow = new BrowserWindow({ show: false });
      await printWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
      
      const pdfData = await printWindow.webContents.printToPDF({
        printBackground: true,
        pageSize: 'A4'
      });
      
      fs.writeFileSync(pdfPath, pdfData);
      printWindow.close();
    });

    return pdfPath;
  });
};
