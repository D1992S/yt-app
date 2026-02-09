import React, { useEffect, useState } from 'react';
import { Brain, CheckCircle, RefreshCw } from 'lucide-react';

interface Model {
  model_id: string;
  type: string;
  version: string;
  trained_at: string;
  metrics_json: string;
  is_active: number;
}

export const ModelRegistryView: React.FC = () => {
  const [models, setModels] = useState<Model[]>([]);
  const [loading, setLoading] = useState(false);
  const [training, setTraining] = useState(false);

  const fetchModels = async () => {
    setLoading(true);
    try {
      const data = await window.electron.ml.getModels();
      setModels(data);
    } finally {
      setLoading(false);
    }
  };

  const handleTrain = async () => {
    setTraining(true);
    try {
      await window.electron.ml.train();
      await fetchModels();
    } catch (e) {
      alert('Training failed');
    } finally {
      setTraining(false);
    }
  };

  useEffect(() => {
    fetchModels();
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          <Brain className="text-indigo-600" />
          Model Registry
        </h2>
        <button 
          onClick={handleTrain}
          disabled={training}
          className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-bold hover:bg-indigo-100 transition-colors disabled:opacity-50"
        >
          <RefreshCw size={14} className={training ? "animate-spin" : ""} />
          {training ? 'Trenowanie...' : 'Trenuj Modele'}
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 text-slate-500 font-semibold">
            <tr>
              <th className="p-3">Model ID</th>
              <th className="p-3">Type</th>
              <th className="p-3">Metrics (sMAPE)</th>
              <th className="p-3">Status</th>
              <th className="p-3 text-right">Trained At</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {models.map((m) => {
              const metrics = JSON.parse(m.metrics_json || '{}');
              return (
                <tr key={m.model_id} className="hover:bg-slate-50">
                  <td className="p-3 font-mono text-slate-700">{m.model_id}</td>
                  <td className="p-3 text-slate-600 uppercase text-xs font-bold">{m.type}</td>
                  <td className="p-3 text-slate-700">
                    {metrics.smape ? `${metrics.smape.toFixed(2)}%` : '-'}
                  </td>
                  <td className="p-3">
                    {m.is_active === 1 ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs font-bold">
                        <CheckCircle size={12} /> Active
                      </span>
                    ) : (
                      <span className="text-slate-400 text-xs">Inactive</span>
                    )}
                  </td>
                  <td className="p-3 text-right text-slate-500">
                    {new Date(m.trained_at).toLocaleDateString()}
                  </td>
                </tr>
              );
            })}
            {models.length === 0 && (
              <tr>
                <td colSpan={5} className="p-8 text-center text-slate-400">No models trained yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
