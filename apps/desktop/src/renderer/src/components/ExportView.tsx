import React, { useState } from 'react';
import { Package, Download, Clock } from 'lucide-react';

export const ExportView: React.FC = () => {
  const [exporting, setExporting] = useState(false);
  const [lastPath, setLastPath] = useState<string | null>(null);

  const handleExport = async () => {
    setExporting(true);
    try {
      const path = await window.electron.export.create();
      setLastPath(path);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
      <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
        <Package className="text-indigo-600" />
        Eksport Tygodniowy
      </h2>

      <button
        onClick={handleExport}
        disabled={exporting}
        className="w-full py-3 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {exporting ? <Clock className="animate-spin" size={20} /> : <Download size={20} />}
        {exporting ? 'Generowanie...' : 'Pobierz Paczkę (PDF+CSV)'}
      </button>

      {lastPath && (
        <div className="mt-3 text-xs text-green-600 bg-green-50 p-2 rounded border border-green-100">
          Zapisano w: {lastPath}
        </div>
      )}
    </div>
  );
};
