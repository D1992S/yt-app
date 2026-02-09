import React, { useEffect, useState } from 'react';
import { Hash, AlertCircle } from 'lucide-react';

interface Cluster {
  id: number;
  name: string;
  gap_score: number | null;
  reason: string | null;
}

export const TopicClustersView: React.FC = () => {
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchClusters = async () => {
    setLoading(true);
    try {
      // Mock IPC for now
      await new Promise(r => setTimeout(r, 500));
      // In real app: window.electron.topics.getClusters()
      
      // Mock Data
      setClusters([
        { id: 1, name: 'tutorial, guide, beginner', gap_score: 8.5, reason: 'Competitors own 85% of this topic.' },
        { id: 2, name: 'review, unboxing, test', gap_score: null, reason: null },
        { id: 3, name: 'vlog, daily, life', gap_score: 7.2, reason: 'Competitors own 72% of this topic.' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClusters();
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          <Hash className="text-purple-600" />
          Klastry Tematyczne
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {clusters.map(c => (
          <div key={c.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-2">
              <h3 className="font-bold text-slate-700 text-sm uppercase tracking-wide">Cluster #{c.id}</h3>
              {c.gap_score && (
                <span className="bg-red-100 text-red-700 text-xs px-2 py-1 rounded-full font-bold flex items-center gap-1">
                  <AlertCircle size={12} /> Gap
                </span>
              )}
            </div>
            <p className="text-slate-800 font-medium mb-3 line-clamp-2 h-10">
              {c.name}
            </p>
            {c.reason ? (
              <div className="text-xs text-red-600 bg-red-50 p-2 rounded border border-red-100">
                {c.reason}
              </div>
            ) : (
              <div className="text-xs text-slate-400 p-2">
                Balanced topic coverage.
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
