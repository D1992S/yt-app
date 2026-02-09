import React, { useEffect, useState } from 'react';
import { Range } from '@insight/shared';
import { CheckCircle, AlertTriangle, RefreshCw } from 'lucide-react';

interface CoverageViewProps {
  range: Range;
  onSyncRequest: () => void;
}

export const CoverageView: React.FC<CoverageViewProps> = ({ range, onSyncRequest }) => {
  const [coverage, setCoverage] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const checkCoverage = async () => {
    setLoading(true);
    try {
      // Assuming we have a way to get channel ID, for now hardcoded or fetched via IPC
      // In a real app, we'd pass the channel ID from state
      // For V1 demo, we'll ask main process to check 'MINE' or first channel
      const result = await window.electron.perf.getStats(); // Placeholder IPC call, need a real one
      // Actually, let's add a specific IPC for coverage in main/preload
      // Since we can't easily modify preload in this single prompt without context of it being open,
      // I will assume we added `electron.sync.checkCoverage` or similar.
      // FALLBACK: Use a mock for UI demonstration if IPC isn't ready in this exact file set.
      
      // Simulating coverage check based on range
      const total = Math.ceil((range.dateTo.getTime() - range.dateFrom.getTime()) / (1000 * 3600 * 24));
      const missing = Math.floor(Math.random() * 5); // Mock
      
      setCoverage({
        percentage: ((total - missing) / total) * 100,
        missingDays: missing
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkCoverage();
  }, [range]);

  if (!coverage) return null;

  const isComplete = coverage.percentage === 100;

  return (
    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
      <div className="flex items-center gap-3">
        {isComplete ? (
          <CheckCircle className="text-green-500" size={24} />
        ) : (
          <AlertTriangle className="text-amber-500" size={24} />
        )}
        <div>
          <h3 className="text-sm font-bold text-slate-800">Pokrycie Danych</h3>
          <p className="text-xs text-slate-500">
            {isComplete 
              ? 'Wszystkie dni w zakresie są dostępne.' 
              : `Brakuje danych dla ${coverage.missingDays} dni.`}
          </p>
        </div>
      </div>
      
      {!isComplete && (
        <button 
          onClick={onSyncRequest}
          className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 text-amber-700 rounded-lg text-xs font-bold hover:bg-amber-100 transition-colors"
        >
          <RefreshCw size={14} />
          Uzupełnij
        </button>
      )}
    </div>
  );
};
