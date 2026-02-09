import React, { useEffect, useState } from 'react';
import { X, RefreshCw, ShieldCheck } from 'lucide-react';

interface PerfEvent {
  id: number;
  name: string;
  duration_ms: number;
  created_at: string;
}

interface DiagnosticsProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Diagnostics: React.FC<DiagnosticsProps> = ({ isOpen, onClose }) => {
  const [stats, setStats] = useState<PerfEvent[]>([]);
  const [integrityStatus, setIntegrityStatus] = useState<string | null>(null);

  const fetchStats = async () => {
    const data = await window.electron.perf.getStats();
    setStats(data);
  };

  const checkIntegrity = async () => {
    setIntegrityStatus('Checking...');
    try {
      const result = await window.electron.db.checkIntegrity();
      setIntegrityStatus(result.join(', '));
    } catch (e) {
      setIntegrityStatus('Error checking integrity');
    }
  };

  useEffect(() => {
    if (isOpen) fetchStats();
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        <div className="p-4 border-b border-slate-200 flex justify-between items-center">
          <h2 className="text-lg font-bold text-slate-800">Diagnostics & Performance</h2>
          <div className="flex gap-2">
            <button onClick={checkIntegrity} className="p-2 hover:bg-slate-100 rounded-full text-blue-600" title="Check DB Integrity">
              <ShieldCheck size={18} />
            </button>
            <button onClick={fetchStats} className="p-2 hover:bg-slate-100 rounded-full">
              <RefreshCw size={18} />
            </button>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full">
              <X size={18} />
            </button>
          </div>
        </div>
        
        {integrityStatus && (
          <div className={`px-4 py-2 text-xs font-mono border-b border-slate-100 ${integrityStatus === 'ok' ? 'text-green-600 bg-green-50' : 'text-slate-600 bg-slate-50'}`}>
            DB Integrity: {integrityStatus}
          </div>
        )}
        
        <div className="p-0 overflow-auto flex-1">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-500 font-semibold sticky top-0">
              <tr>
                <th className="p-3">Event Name</th>
                <th className="p-3 text-right">Duration (ms)</th>
                <th className="p-3 text-right">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {stats.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50">
                  <td className="p-3 font-mono text-slate-700">{s.name}</td>
                  <td className={`p-3 text-right font-bold ${s.duration_ms > 1000 ? 'text-red-600' : 'text-green-600'}`}>
                    {s.duration_ms}ms
                  </td>
                  <td className="p-3 text-right text-slate-500">
                    {new Date(s.created_at).toLocaleTimeString()}
                  </td>
                </tr>
              ))}
              {stats.length === 0 && (
                <tr>
                  <td colSpan={3} className="p-8 text-center text-slate-400">No performance events recorded yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
