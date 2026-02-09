import React, { useEffect, useState } from 'react';
import { Beaker, Tag } from 'lucide-react';

interface StyleStat {
  tag: string;
  count: number;
  avgViews7d: number;
}

export const LabView: React.FC = () => {
  const [stats, setStats] = useState<StyleStat[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const data = await window.electron.lab.analyze();
      setStats(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  return (
    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
      <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
        <Beaker className="text-purple-600" />
        Laboratorium Stylów
      </h2>

      {loading ? (
        <div className="text-center py-8 text-slate-400">Analiza...</div>
      ) : (
        <div className="space-y-3">
          {stats.map((s) => (
            <div key={s.tag} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
              <div className="flex items-center gap-2">
                <Tag size={16} className="text-slate-400" />
                <span className="font-medium text-slate-700">{s.tag}</span>
                <span className="text-xs text-slate-400">({s.count} videos)</span>
              </div>
              <div className="font-bold text-slate-800">
                {s.avgViews7d.toLocaleString()} <span className="text-xs font-normal text-slate-500">avg views (7d)</span>
              </div>
            </div>
          ))}
          {stats.length === 0 && (
            <div className="text-center py-4 text-slate-400 text-sm">Brak otagowanych filmów. Dodaj tagi w bazie.</div>
          )}
        </div>
      )}
    </div>
  );
};
