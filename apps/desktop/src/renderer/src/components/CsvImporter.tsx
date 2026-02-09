import React, { useState, useRef } from 'react';
import { Upload, FileText, CheckCircle } from 'lucide-react';

export const CsvImporter: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [rowsProcessed, setRowsProcessed] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setStatus('idle');
    }
  };

  const handleImport = async () => {
    if (!file) return;
    setStatus('uploading');
    
    const reader = new FileReader();
    reader.onload = async (e) => {
      const content = e.target?.result as string;
      try {
        const count = await window.electron.import.csv({ 
          content, 
          mapping: { dateCol: 0, videoIdCol: 1, metricCol: 2 } // Default mapping for demo
        });
        setRowsProcessed(count);
        setStatus('success');
      } catch (err) {
        console.error(err);
        setStatus('error');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
      <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
        <Upload className="text-green-600" />
        Import Danych (CSV)
      </h2>

      <div 
        className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:bg-slate-50 transition-colors cursor-pointer"
        onClick={() => fileInputRef.current?.click()}
      >
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileChange} 
          accept=".csv" 
          className="hidden" 
        />
        
        {file ? (
          <div className="flex flex-col items-center text-slate-700">
            <FileText size={32} className="mb-2 text-blue-500" />
            <span className="font-medium">{file.name}</span>
            <span className="text-xs text-slate-400">{(file.size / 1024).toFixed(1)} KB</span>
          </div>
        ) : (
          <div className="text-slate-400">
            <Upload size={32} className="mx-auto mb-2" />
            <p>Kliknij lub upuść plik CSV tutaj</p>
            <p className="text-xs mt-1">Format: Date, VideoID, Views</p>
          </div>
        )}
      </div>

      {file && status !== 'success' && (
        <button
          onClick={handleImport}
          disabled={status === 'uploading'}
          className="w-full mt-4 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          {status === 'uploading' ? 'Przetwarzanie...' : 'Importuj'}
        </button>
      )}

      {status === 'success' && (
        <div className="mt-4 p-3 bg-green-50 text-green-700 rounded-lg flex items-center gap-2">
          <CheckCircle size={20} />
          <span>Zaimportowano {rowsProcessed} wierszy pomyślnie.</span>
        </div>
      )}
      
      {status === 'error' && (
        <div className="mt-4 p-3 bg-red-50 text-red-700 rounded-lg">
          Błąd importu. Sprawdź format pliku.
        </div>
      )}
    </div>
  );
};
