import React, { useState, useEffect } from 'react';
import { AppState, ReportMode, SafeModeError, ReportData } from '@insight/shared';
import { Activity, Play, Download, BarChart, MessageSquare, Loader2 } from 'lucide-react';
import { AuthStatus } from './components/AuthStatus';
import { ProgressBar } from './components/ProgressBar';
import { Diagnostics } from './components/Diagnostics';
import { CoverageView } from './components/CoverageView';
import { CompetitorView } from './components/CompetitorView';
import { TopicClustersView } from './components/TopicClustersView';
import { ModelRegistryView } from './components/ModelRegistryView';
import { AlertsView } from './components/AlertsView';
import { QualityRankingView } from './components/QualityRankingView';
import { SearchView } from './components/SearchView';
import { CsvImporter } from './components/CsvImporter';
import { LabView } from './components/LabView';
import { BacklogView } from './components/BacklogView';
import { CalendarView } from './components/CalendarView';
import { ExportView } from './components/ExportView';
import { AssistantPanel } from './components/AssistantPanel';
import { SafeMode } from './components/SafeMode';
import { ProfileSwitcher } from './components/ProfileSwitcher';
import { DateSelector } from './components/DateSelector';
import { ReportConfig } from './components/ReportConfig';
import { ReportView } from './components/ReportView';
import { Button, Card } from './components/ui/DesignSystem';
import { calculateMetrics } from '@insight/core';
import { generateInsights } from '@insight/llm';

const App: React.FC = () => {
  const [state, setState] = useState<AppState>({
    status: 'IDLE',
    currentRange: {
      start: new Date(Date.now() - 28 * 24 * 60 * 60 * 1000),
      end: new Date(),
      preset: '28d'
    },
    currentMode: 'STANDARD',
    report: null,
    error: null,
    safeModeError: undefined
  });

  const [isAuthLoading, setAuthLoading] = useState(false);
  const [syncProgress, setSyncProgress] = useState({ progress: 0, message: '', isActive: false });
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [showAssistant, setShowAssistant] = useState(false);
  const [user, setUser] = useState<any>(undefined);

  // Helper to parse error from IPC
  const parseError = (e: any): SafeModeError | string => {
    try {
      // IPC throws "Error: JSON_STRING"
      const msg = e.message.replace(/^Error: /, '');
      const appError = JSON.parse(msg);
      if (appError.code) {
        // Map AppError to SafeModeError if critical
        if (['NETWORK_ERROR', 'AUTH_ERROR', 'QUOTA_EXCEEDED', 'DB_LOCKED'].includes(appError.code)) {
          return {
            type: appError.code === 'NETWORK_ERROR' ? 'network' :
                  appError.code === 'AUTH_ERROR' ? 'auth' :
                  appError.code === 'QUOTA_EXCEEDED' ? 'quota' : 'db_locked',
            message: appError.message,
            details: appError.details,
            isRetryable: appError.isRetryable
          };
        }
        return appError.message;
      }
    } catch (parseErr) {
      // Fallback
    }
    return e.message || 'Unknown error';
  };

  useEffect(() => {
    const init = async () => {
      try {
        const [pingRes, pathsRes, userRes] = await Promise.all([
          window.electron.ping(),
          window.electron.getPaths(),
          window.electron.auth.getStatus()
        ]);
        setUser(userRes || undefined);
      } catch (e) {
        console.error("Init failed", e);
      }
    };
    init();

    const cleanup = window.electron.sync.onProgress((p) => {
      setSyncProgress({ progress: p.progress, message: p.message, isActive: true });
      if (p.progress === 100) {
        setTimeout(() => setSyncProgress(prev => ({ ...prev, isActive: false })), 2000);
      }
    });

    return cleanup;
  }, []);

  const handleConnect = async () => {
    setAuthLoading(true);
    try {
      const u = await window.electron.auth.connect();
      setUser(u);
    } catch (error) {
      alert('Logowanie nie powiodło się');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleDisconnect = async () => {
    setAuthLoading(true);
    try {
      await window.electron.auth.disconnect();
      setUser(undefined);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleGenerateReport = async () => {
    setState((prev) => ({ ...prev, status: 'FETCHING', error: null }));
    try {
      setSyncProgress({ progress: 10, message: 'Syncing data...', isActive: true });
      await window.electron.sync.start({
        dateFrom: state.currentRange.start,
        dateTo: state.currentRange.end,
        preset: state.currentRange.preset
      });

      setSyncProgress({ progress: 80, message: 'Generating Report...', isActive: true });
      await window.electron.report.generate({
        dateFrom: state.currentRange.start,
        dateTo: state.currentRange.end,
        preset: state.currentRange.preset
      }, state.currentMode);

      const data = await window.electron.analytics.getReportData({
        dateFrom: state.currentRange.start,
        dateTo: state.currentRange.end,
        preset: state.currentRange.preset
      });
      
      const metrics = calculateMetrics(data);
      let insights = '';
      if (state.currentMode !== 'FAST') {
        insights = await generateInsights(metrics, state.currentRange);
      }

      const report: ReportData = {
        id: crypto.randomUUID().slice(0, 8).toUpperCase(),
        generatedAt: new Date().toISOString(),
        range: state.currentRange,
        mode: state.currentMode,
        metrics,
        timeSeries: data,
        insights,
        isOffline: true,
      };

      setState((prev) => ({ ...prev, status: 'DONE', report }));
      setSyncProgress({ progress: 100, message: 'Done!', isActive: false });

    } catch (e: any) {
      console.error(e);
      const parsed = parseError(e);
      if (typeof parsed === 'object') {
         setState(prev => ({ ...prev, safeModeError: parsed }));
      } else {
         setState(prev => ({ ...prev, status: 'ERROR', error: parsed }));
      }
      setSyncProgress(prev => ({ ...prev, isActive: false }));
    }
  };

  const isProcessing = ['FETCHING', 'CALCULATING', 'ANALYZING'].includes(state.status) || syncProgress.isActive;

  return (
    <div className="min-h-screen bg-bg text-text flex flex-col font-sans selection:bg-accent selection:text-white">
      <Diagnostics isOpen={showDiagnostics} onClose={() => setShowDiagnostics(false)} />
      <AssistantPanel isOpen={showAssistant} onClose={() => setShowAssistant(false)} />
      
      {state.safeModeError && (
        <SafeMode 
          error={state.safeModeError} 
          onRetry={() => {
            setState(prev => ({ ...prev, safeModeError: undefined }));
            handleGenerateReport();
          }}
          onClose={() => setState(prev => ({ ...prev, safeModeError: undefined }))}
        />
      )}
      
      <header className="sticky top-0 z-30 w-full border-b border-border bg-bg/95 backdrop-blur supports-[backdrop-filter]:bg-bg/60">
        <div className="flex h-14 items-center justify-between px-4 md:px-6 draggable">
          <div className="flex items-center gap-2 text-text font-bold tracking-tight">
            <Activity size={20} className="text-accent" />
            <span>InsightEngine</span>
          </div>
          
          <div className="flex items-center gap-2 no-drag">
             <ProfileSwitcher />
             <Button 
               variant="ghost" size="icon"
               onClick={() => setShowAssistant(!showAssistant)}
               className={showAssistant ? 'bg-accent/10 text-accent' : ''}
               title="AI Assistant"
             >
               <MessageSquare size={18} />
             </Button>
             <Button 
               variant="ghost" size="icon"
               onClick={() => setShowDiagnostics(true)}
               title="Diagnostics"
             >
               <BarChart size={18} />
             </Button>
             <div className="w-px h-6 bg-border mx-1"></div>
             <AuthStatus 
               user={user} 
               onConnect={handleConnect} 
               onDisconnect={handleDisconnect}
               isLoading={isAuthLoading}
             />
          </div>
        </div>
      </header>

      <main className="flex-1 w-full max-w-[1400px] mx-auto p-4 md:p-6 lg:p-8 grid gap-6">
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 space-y-4">
            <DateSelector 
              value={state.currentRange} 
              onChange={(r) => setState(s => ({ ...s, currentRange: r }))}
              disabled={isProcessing}
            />
            <ReportConfig 
              mode={state.currentMode} 
              onChange={(m) => setState(s => ({ ...s, currentMode: m }))}
              disabled={isProcessing}
            />
          </div>
          
          <div className="lg:col-span-4 flex flex-col gap-4">
             <Card className="flex-1 flex flex-col justify-center items-center p-6 border-accent/20 bg-accent/5 hover:bg-accent/10 transition-colors cursor-pointer group" onClick={!isProcessing ? handleGenerateReport : undefined}>
                {isProcessing ? (
                  <div className="flex flex-col items-center gap-3 animate-pulse">
                    <Loader2 className="animate-spin text-accent" size={48} />
                    <span className="text-accent font-medium">Przetwarzanie...</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-3 group-hover:scale-105 transition-transform">
                    <div className="w-16 h-16 rounded-full bg-accent flex items-center justify-center shadow-lg shadow-accent/20">
                      <Play className="text-white fill-white ml-1" size={32} />
                    </div>
                    <div className="text-center">
                      <span className="block text-xl font-bold text-text">Generuj Raport</span>
                      <span className="text-text-muted text-sm">Pobierz dane + PDF</span>
                    </div>
                  </div>
                )}
             </Card>
          </div>
        </section>

        <ProgressBar 
          progress={syncProgress.progress} 
          message={syncProgress.message} 
          isActive={syncProgress.isActive} 
        />

        {state.status === 'ERROR' && (
          <div className="p-4 bg-danger/10 border border-danger/20 rounded-lg text-danger">
            <strong>Błąd:</strong> {state.error}
          </div>
        )}

        {user && (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div className="xl:col-span-2 space-y-6">
              {state.report && <ReportView data={state.report} />}
              <CoverageView range={state.currentRange} onSyncRequest={handleGenerateReport} />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <AlertsView />
                <QualityRankingView />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <CompetitorView />
                <TopicClustersView />
              </div>
              
              <LabView />
            </div>

            <div className="space-y-6">
              <ExportView />
              <BacklogView />
              <CalendarView />
              <ModelRegistryView />
              <SearchView />
              <CsvImporter />
            </div>
          </div>
        )}
      </main>

      <div className="lg:hidden sticky bottom-0 border-t border-border bg-bg/95 backdrop-blur p-4 flex items-center justify-between gap-4">
         <div className="text-xs text-text-muted">
            {isProcessing ? syncProgress.message : 'Gotowy do pracy'}
         </div>
         <Button 
           onClick={handleGenerateReport} 
           disabled={isProcessing || !user}
           className="w-full max-w-[200px]"
         >
           {isProcessing ? <Loader2 className="animate-spin mr-2" size={16} /> : <Play className="mr-2 fill-current" size={16} />}
           {isProcessing ? 'Praca...' : 'Start'}
         </Button>
      </div>

    </div>
  );
};

export default App;
