import React, { useEffect, useState } from 'react';
import { Calendar as CalIcon, AlertTriangle } from 'lucide-react';
import { ContentPlanItem } from '@insight/shared';

export const CalendarView: React.FC = () => {
  const [plan, setPlan] = useState<ContentPlanItem[]>([]);

  const fetchPlan = async () => {
    const data = await window.electron.calendar.get();
    setPlan(data);
  };

  useEffect(() => {
    fetchPlan();
  }, []);

  return (
    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
      <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
        <CalIcon className="text-blue-600" />
        Kalendarz Publikacji
      </h2>

      <div className="space-y-3">
        {plan.map((item) => (
          <div key={item.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
            <div>
              <div className="font-medium text-slate-800 text-sm">{item.title}</div>
              <div className="text-xs text-slate-500">{item.targetDate}</div>
            </div>
            {item.riskScore && item.riskScore > 30 && (
              <div className="flex items-center gap-1 text-amber-600 text-xs font-bold" title={item.riskReason}>
                <AlertTriangle size={14} />
                Ryzyko powtórki
              </div>
            )}
          </div>
        ))}
        {plan.length === 0 && (
          <div className="text-center py-4 text-slate-400 text-sm">Brak zaplanowanych treści.</div>
        )}
      </div>
    </div>
  );
};
