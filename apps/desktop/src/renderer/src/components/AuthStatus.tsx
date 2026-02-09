import React from 'react';
import { UserProfile } from '@insight/shared';
import { LogIn, LogOut, User } from 'lucide-react';
import { Button } from './ui/DesignSystem';

interface AuthStatusProps {
  user?: UserProfile;
  onConnect: () => void;
  onDisconnect: () => void;
  isLoading: boolean;
}

export const AuthStatus: React.FC<AuthStatusProps> = ({ user, onConnect, onDisconnect, isLoading }) => {
  if (user) {
    return (
      <div className="flex items-center gap-3 bg-panel-2 py-1.5 px-3 pr-2 rounded-full border border-border">
        {user.picture ? (
          <img src={user.picture} alt={user.name} className="w-6 h-6 rounded-full" />
        ) : (
          <div className="w-6 h-6 rounded-full bg-accent/20 flex items-center justify-center text-accent">
            <User size={14} />
          </div>
        )}
        <div className="flex flex-col hidden sm:flex">
          <span className="text-xs font-bold text-text leading-none max-w-[100px] truncate">{user.name}</span>
        </div>
        <button 
          onClick={onDisconnect}
          disabled={isLoading}
          className="ml-1 p-1 text-text-muted hover:text-danger hover:bg-danger/10 rounded-full transition-colors"
          title="Wyloguj"
        >
          <LogOut size={14} />
        </button>
      </div>
    );
  }

  return (
    <Button
      onClick={onConnect}
      disabled={isLoading}
      variant="secondary"
      size="sm"
      className="gap-2"
    >
      <LogIn size={14} className="text-accent" />
      {isLoading ? '...' : 'Połącz'}
    </Button>
  );
};
