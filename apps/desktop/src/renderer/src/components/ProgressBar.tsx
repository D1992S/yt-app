import React from 'react';
import { Card, CardContent } from './ui/DesignSystem';

interface ProgressBarProps {
  progress: number;
  message: string;
  isActive: boolean;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ progress, message, isActive }) => {
  if (!isActive) return null;

  return (
    <Card className="mb-6 animate-in fade-in slide-in-from-top-2 border-accent/30">
      <CardContent className="py-3">
        <div className="flex justify-between text-xs font-semibold text-accent mb-2">
          <span>{message}</span>
          <span>{progress}%</span>
        </div>
        <div className="w-full bg-bg rounded-full h-2 overflow-hidden border border-border">
          <div 
            className="bg-accent h-full rounded-full transition-all duration-500 ease-out" 
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      </CardContent>
    </Card>
  );
};
