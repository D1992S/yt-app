import React, { useEffect, useState } from 'react';
import { User, Plus, Check } from 'lucide-react';

interface Profile {
  id: number;
  name: string;
  channel_id: string;
  is_active: number;
}

export const ProfileSwitcher: React.FC = () => {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newChannelId, setNewChannelId] = useState('');

  const fetchProfiles = async () => {
    const data = await window.electron.profile.list();
    setProfiles(data);
  };

  const handleSwitch = async (id: number) => {
    await window.electron.profile.switch(id);
    setIsOpen(false);
    fetchProfiles();
    window.location.reload(); // Simple reload to refresh app state with new profile context
  };

  const handleCreate = async () => {
    if (!newName || !newChannelId) return;
    await window.electron.profile.create({ name: newName, channelId: newChannelId });
    setShowAdd(false);
    setNewName('');
    setNewChannelId('');
    fetchProfiles();
  };

  useEffect(() => {
    fetchProfiles();
  }, []);

  const activeProfile = profiles.find(p => p.is_active === 1);

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors text-sm font-medium text-slate-700"
      >
        <User size={16} className="text-slate-500" />
        {activeProfile ? activeProfile.name : 'Wybierz Profil'}
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-slate-200 z-50 p-2">
          <div className="space-y-1 mb-2">
            {profiles.map(p => (
              <button
                key={p.id}
                onClick={() => handleSwitch(p.id)}
                className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-slate-50 text-left text-sm"
              >
                <span className={p.is_active ? 'font-bold text-blue-700' : 'text-slate-700'}>{p.name}</span>
                {p.is_active === 1 && <Check size={14} className="text-blue-600" />}
              </button>
            ))}
          </div>
          
          {showAdd ? (
            <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
              <input 
                className="w-full mb-2 px-2 py-1 text-xs border rounded" 
                placeholder="Nazwa Profilu"
                value={newName}
                onChange={e => setNewName(e.target.value)}
              />
              <input 
                className="w-full mb-2 px-2 py-1 text-xs border rounded" 
                placeholder="Channel ID"
                value={newChannelId}
                onChange={e => setNewChannelId(e.target.value)}
              />
              <button 
                onClick={handleCreate}
                className="w-full py-1 bg-blue-600 text-white text-xs rounded font-bold"
              >
                Utwórz
              </button>
            </div>
          ) : (
            <button 
              onClick={() => setShowAdd(true)}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 border-t border-slate-100 text-xs font-bold text-blue-600 hover:bg-blue-50 rounded-b-lg"
            >
              <Plus size={14} /> Dodaj Profil
            </button>
          )}
        </div>
      )}
    </div>
  );
};
