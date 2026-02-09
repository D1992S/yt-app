import React, { useEffect, useState } from 'react';
import { Star, Zap, Clock, MousePointer } from 'lucide-react';

interface QualityScore {
  video_id: string;
  title: string;
  score: number;
  velocity_score: number;
  efficiency_score: number;
  conversion_score: number;
  explain_json: string;
}

export const QualityRankingView: React.FC = () => {
  const [scores, setScores] = useState<QualityScore[]>([]);

  const fetchScores = async () => {
    // Mock IPC
    await new Promise(r => setTimeout(r, 300));
    // In real app: window.electron.analytics.getQualityScores()
    
    // Mock Data
    setScores([
      {
        video_id: '1',
        title: 'Ultimate Guide 2024',
        score: 85,
        velocity_score: 90,
        efficiency_score: 80,
        conversion_score: 85,
        explain_json: JSON.stringify({ verdict: 'High Quality' })
      },
      {
        video_id: '2',
        title: 'Quick Tips',
        score: 65,
        velocity_score: 70,
        efficiency_score: 50,
        conversion_score: 80,
        explain_json: JSON.stringify({ verdict: 'Average' })
      }
    ]);
  };

  useEffect(() => {
    fetchScores();
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          <Star className="text-yellow-500" />
          Quality Ranking
        </h2>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 text-slate-500 font-semibold">
            <tr>
              <th className="p-3">Video</th>
              <th className="p-3 text-center">Score</th>
              <th className="p-3 text-center"><Zap size={14} className="inline" /> Vel</th>
              <th className="p-3 text-center"><Clock size={14} className="inline" /> Eff</th>
              <th className="p-3 text-center"><MousePointer size={14} className="inline" /> Conv</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {scores.map((s) => (
              <tr key={s.video_id} className="hover:bg-slate-50">
                <td className="p-3 font-medium text-slate-800">{s.title}</td>
                <td className="p-3 text-center">
                  <span className={`px-2 py-1 rounded-full text-xs font-bold ${s.score > 80 ? 'bg-green-100 text-green-700' : s.score > 50 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                    {s.score.toFixed(0)}
                  </span>
                </td>
                <td className="p-3 text-center text-slate-600">{s.velocity_score.toFixed(0)}</td>
                <td className="p-3 text-center text-slate-600">{s.efficiency_score.toFixed(0)}</td>
                <td className="p-3 text-center text-slate-600">{s.conversion_score.toFixed(0)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
