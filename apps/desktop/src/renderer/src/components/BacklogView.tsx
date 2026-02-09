import React, { useEffect, useState } from 'react';
import { Lightbulb, Plus, ArrowUpRight } from 'lucide-react';
import { Idea } from '@insight/shared';

export const BacklogView: React.FC = () => {
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [newTitle, setNewTitle] = useState('');

  const fetchIdeas = async () => {
    const data = await window.electron.backlog.get();
    setIdeas(data);
  };

  const handleAdd = async () => {
    if (!newTitle.trim()) return;
    await window.electron.backlog.add({
      title: newTitle,
      description: '',
      source: 'manual',
      effort: 5,
      status: 'backlog'
    });
    setNewTitle('');
    fetchIdeas();
  };

  useEffect(() => {
    fetchIdeas();
  }, []);

  return (
    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
          <Lightbulb className="text-yellow-500" />
          Backlog Pomysłów
        </h2>
      </div>

      <div className="flex gap-2 mb-4">
        <input
          type="text"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="Nowy pomysł..."
          className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm"
        />
        <button onClick={handleAdd} className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          <Plus size={18} />
        </button>
      </div>

      <div className="space-y-2 max-h-60 overflow-y-auto">
        {ideas.map((idea) => (
          <div key={idea.id} className="p-3 bg-slate-50 rounded-lg border border-slate-100 flex justify-between items-center">
            <div>
              <div className="font-medium text-slate-800 text-sm">{idea.title}</div>
              <div className="text-xs text-slate-500">Effort: {idea.effort}/10</div>
            </div>
            {idea.score && (
              <div className="flex items-center gap-1 text-green-600 font-bold text-sm">
                <ArrowUpRight size={14} />
                {idea.score.toFixed(0)}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
