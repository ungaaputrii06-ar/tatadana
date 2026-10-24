import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'orange' | 'green' | 'red' | 'blue' | 'cyan' | 'purple' | 'gray';
  size?: 'sm' | 'md';
  className?: string;
}

export function Badge({ children, variant = 'default', size = 'sm', className = '' }: BadgeProps) {
  const variantStyles = {
    default: 'bg-slate-800 text-slate-200 border-slate-700 font-semibold',
    orange: 'bg-blue-950/60 text-cyan-400 border-cyan-800/60 font-semibold',
    blue: 'bg-blue-950/70 text-blue-400 border-blue-800/80 font-semibold',
    cyan: 'bg-cyan-950/70 text-cyan-400 border-cyan-800/80 font-semibold',
    green: 'bg-emerald-950/60 text-emerald-400 border-emerald-800/60 font-semibold',
    red: 'bg-rose-950/60 text-rose-400 border-rose-800/60 font-semibold',
    purple: 'bg-purple-950/60 text-purple-400 border-purple-800/60 font-semibold',
    gray: 'bg-slate-800 text-slate-400 border-slate-700 font-medium',
  }[variant];

  const sizeStyles = {
    sm: 'text-xs px-2.5 py-0.5 rounded-full',
    md: 'text-sm px-3 py-1 rounded-full',
  }[size];

  return (
    <span className={`inline-flex items-center gap-1.5 border ${variantStyles} ${sizeStyles} ${className}`}>
      {children}
    </span>
  );
}
