import React, { useEffect, useState } from 'react';
import { TrendingUp, Users, Video } from 'lucide-react';

interface Hit {
  video_id: string;
  title: string;
  channel_title: string;
  velocity_24h: number;
  momentum_score: number;
  day: string;
}

export const CompetitorView: React.FC = () => {
  const [hits, setHits] = useState<Hit[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchHits = async () => {
    setLoading(true);
    try {
      // Mocking IPC call for now as we can't easily add new IPC in this prompt flow
      // In real implementation: const data = await window.electron.competitors.getHits();
      // Using a timeout to simulate fetch
      await new Promise(r => setTimeout(r, 500));
      
      // Mock Data for UI Demo
      setHits([
        { video_id: '1', title: 'Viral Competitor Video', channel_title: 'Comp A', velocity_24h: 15000, momentum_score: 3.5, day: '2023-10-27' },
        { video_id: '2', title: 'Another Hit', channel_title: 'Comp B', velocity_24h: 8000, momentum_score: 2.1, day: '2023-10-27' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHits();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          <Users className="text-blue-600" />
          Radar Konkurencji
        </h2>
        <button className="text-sm text-blue-600 hover:underline">Zarządzaj</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Hits List */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
            <TrendingUp size={18} className="text-green-500" />
            Hity (Ostatnie 24h)
          </h3>
          
          {loading ? (
            <div className="text-center py-8 text-slate-400">Ładowanie...</div>
          ) : (
            <div className="space-y-3">
              {hits.map(hit => (
                <div key={hit.video_id} className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <div className="bg-red-100 text-red-600 p-2 rounded-lg">
                    <Video size={20} />
                  </div>
                  <div>
                    <div className="font-semibold text-slate-800 text-sm line-clamp-1">{hit.title}</div>
                    <div className="text-xs text-slate-500">{hit.channel_title}</div>
                    <div className="mt-1 flex items-center gap-2 text-xs">
                      <span className="font-bold text-green-600">+{hit.velocity_24h.toLocaleString()} views</span>
                      <span className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded text-[10px]">
                        Momentum: {hit.momentum_score.toFixed(1)}x
                      </span>
                    </div>
                  </div>
                </div>
              ))}
              {hits.length === 0 && (
                <div className="text-center py-4 text-slate-400 text-sm">Brak wykrytych hitów.</div>
              )}
            </div>
          )}
        </div>

        {/* Placeholder for Growth Chart */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col items-center justify-center text-slate-400">
          <TrendingUp size={48} className="mb-2 opacity-20" />
          <span className="text-sm">Wykres wzrostu konkurencji (WIP)</span>
        </div>
      </div>
    </div>
  );
};
