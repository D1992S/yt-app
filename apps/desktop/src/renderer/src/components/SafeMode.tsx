import React from 'react';
import { AlertTriangle, RefreshCw, Database, Trash2, ShieldAlert } from 'lucide-react';
import { SafeModeError } from '@insight/shared';

interface SafeModeProps {
  error: SafeModeError;
  onRetry: () => void;
  onClose: () => void;
}

export const SafeMode: React.FC<SafeModeProps> = ({ error, onRetry, onClose }) => {
  const handleRecovery = async (action: 'vacuum' | 'reindex' | 'reset_cache') => {
    await window.electron.recovery.run(action);
    alert('Recovery action completed. Please retry sync.');
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 border-l-4 border-red-500">
        <div className="flex items-center gap-3 mb-4">
          <ShieldAlert className="text-red-500" size={32} />
          <div>
            <h2 className="text-xl font-bold text-slate-800">Safe Mode Active</h2>
            <p className="text-sm text-slate-500">System encountered a critical error.</p>
          </div>
        </div>

        <div className="bg-red-50 p-4 rounded-lg border border-red-100 mb-6">
          <p className="font-bold text-red-800 uppercase text-xs mb-1">{error.type}</p>
          <p className="text-red-700 text-sm">{error.message}</p>
        </div>

        <div className="space-y-3">
          <h3 className="text-sm font-bold text-slate-700">Recovery Options</h3>
          
          <button 
            onClick={onRetry}
            className="w-full flex items-center justify-center gap-2 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
          >
            <RefreshCw size={16} />
            Retry Operation
          </button>

          <div className="grid grid-cols-2 gap-3">
            <button 
              onClick={() => handleRecovery('vacuum')}
              className="flex items-center justify-center gap-2 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 text-sm"
            >
              <Database size={14} />
              Optimize DB
            </button>
            <button 
              onClick={() => handleRecovery('reset_cache')}
              className="flex items-center justify-center gap-2 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 text-sm"
            >
              <Trash2 size={14} />
              Clear Cache
            </button>
          </div>
          
          <button 
            onClick={onClose}
            className="w-full text-center text-slate-400 text-sm hover:text-slate-600 mt-2"
          >
            Dismiss (Unsafe)
          </button>
        </div>
      </div>
    </div>
  );
};
