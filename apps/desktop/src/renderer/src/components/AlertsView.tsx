import React, { useEffect, useState } from 'react';
import { Bell, Check, ChevronRight } from 'lucide-react';

interface Alert {
  id: number;
  severity: 'high' | 'medium' | 'low';
  message: string;
  action_json?: string;
  created_at: string;
}

export const AlertsView: React.FC = () => {
  const [alerts, setAlerts] = useState<Alert[]>([]);

  const fetchAlerts = async () => {
    // Mock IPC
    await new Promise(r => setTimeout(r, 300));
    // In real app: window.electron.alerts.getUnread()
    
    // Mock Data
    setAlerts([
      { 
        id: 1, 
        severity: 'high', 
        message: 'CTR dropped by 25% on recent videos.', 
        created_at: new Date().toISOString(),
        action_json: JSON.stringify({
          title: 'Fix CTR Drop',
          steps: ['Check thumbnail contrast', 'Verify title promise', 'A/B test title']
        })
      },
      { 
        id: 2, 
        severity: 'medium', 
        message: 'Competitor hit detected in "Tutorial" gap.', 
        created_at: new Date().toISOString(),
        action_json: JSON.stringify({
          title: 'Counter Hit',
          steps: ['Watch competitor video', 'Identify missing info', 'Script better version']
        })
      }
    ]);
  };

  useEffect(() => {
    fetchAlerts();
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          <Bell className="text-amber-600" />
          Alerty & Playbook
        </h2>
      </div>

      <div className="space-y-3">
        {alerts.map(alert => {
          const action = alert.action_json ? JSON.parse(alert.action_json) : null;
          return (
            <div key={alert.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-3">
              <div className="flex justify-between items-start">
                <div className="flex gap-3">
                  <div className={`w-2 h-2 mt-2 rounded-full ${alert.severity === 'high' ? 'bg-red-500' : 'bg-amber-500'}`}></div>
                  <div>
                    <p className="font-semibold text-slate-800">{alert.message}</p>
                    <p className="text-xs text-slate-400">{new Date(alert.created_at).toLocaleString()}</p>
                  </div>
                </div>
                <button className="text-slate-400 hover:text-green-600 transition-colors">
                  <Check size={20} />
                </button>
              </div>

              {action && (
                <div className="bg-slate-50 rounded-lg p-3 border border-slate-100 ml-5">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-600 uppercase mb-2">
                    <ChevronRight size={14} />
                    Playbook: {action.title}
                  </div>
                  <ul className="list-disc list-inside text-sm text-slate-700 space-y-1">
                    {action.steps.map((step: string, i: number) => (
                      <li key={i}>{step}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          );
        })}
        {alerts.length === 0 && (
          <div className="text-center py-8 text-slate-400">Brak nowych alertów.</div>
        )}
      </div>
    </div>
  );
};
