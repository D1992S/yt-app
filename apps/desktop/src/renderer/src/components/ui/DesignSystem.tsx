import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

// --- Card ---
export const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <div className={cn("bg-panel border border-border rounded-xl shadow-sm overflow-hidden", className)}>
    {children}
  </div>
);

export const CardHeader: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <div className={cn("px-4 py-3 border-b border-border flex items-center justify-between", className)}>
    {children}
  </div>
);

export const CardTitle: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <h3 className={cn("text-sm font-semibold text-text uppercase tracking-wide flex items-center gap-2", className)}>
    {children}
  </h3>
);

export const CardContent: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <div className={cn("p-4", className)}>
    {children}
  </div>
);

// --- Button ---
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
  size?: 'sm' | 'md' | 'lg' | 'icon';
}

export const Button: React.FC<ButtonProps> = ({ children, className, variant = 'primary', size = 'md', ...props }) => {
  const variants = {
    primary: "bg-accent hover:bg-accent-hover text-white shadow-sm",
    secondary: "bg-panel-2 hover:bg-zinc-700 text-text border border-border",
    ghost: "hover:bg-panel-2 text-text-muted hover:text-text",
    danger: "bg-danger/10 text-danger hover:bg-danger/20 border border-danger/20",
    outline: "border border-border bg-transparent hover:bg-panel-2 text-text"
  };
  
  const sizes = {
    sm: "h-8 px-3 text-xs",
    md: "h-10 px-4 text-sm",
    lg: "h-12 px-6 text-base",
    icon: "h-9 w-9 p-0 flex items-center justify-center"
  };

  return (
    <button 
      className={cn(
        "inline-flex items-center justify-center rounded-lg font-medium transition-colors disabled:opacity-50 disabled:pointer-events-none",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
};

// --- Badge ---
export const Badge: React.FC<{ children: React.ReactNode; variant?: 'default' | 'success' | 'warning' | 'danger'; className?: string }> = ({ children, variant = 'default', className }) => {
  const variants = {
    default: "bg-panel-2 text-text-muted",
    success: "bg-green-500/10 text-green-500 border-green-500/20",
    warning: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
    danger: "bg-red-500/10 text-red-500 border-red-500/20"
  };
  return (
    <span className={cn("inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border border-transparent", variants[variant], className)}>
      {children}
    </span>
  );
};

// --- Input ---
export const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = ({ className, ...props }) => (
  <input 
    className={cn(
      "flex h-9 w-full rounded-md border border-border bg-bg px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-text-muted focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-50 text-text",
      className
    )}
    {...props}
  />
);

// --- Label ---
export const Label: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <label className={cn("text-xs font-medium text-text-muted uppercase tracking-wider mb-1.5 block", className)}>
    {children}
  </label>
);
