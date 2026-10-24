import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  const variantStyles = {
    primary:
      'bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white shadow-md shadow-blue-500/25 font-semibold active:scale-[0.98]',
    secondary:
      'bg-slate-800 hover:bg-slate-700 text-slate-100 font-semibold active:scale-[0.98] border border-slate-700',
    outline:
      'border border-slate-700 hover:border-cyan-400 hover:text-cyan-400 text-slate-300 bg-slate-900/60 hover:bg-slate-800/80 active:scale-[0.98]',
    ghost:
      'text-slate-400 hover:bg-slate-800 hover:text-white active:scale-[0.98]',
    danger:
      'bg-rose-600 hover:bg-rose-700 text-white font-semibold shadow-sm active:scale-[0.98]',
  }[variant];

  const sizeStyles = {
    sm: 'text-xs px-3 py-1.5 rounded-lg gap-1.5',
    md: 'text-sm px-4 py-2.5 rounded-xl gap-2',
    lg: 'text-base px-6 py-3.5 rounded-xl gap-2.5 font-semibold',
  }[size];

  return (
    <button
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center transition-all duration-150 disabled:opacity-50 disabled:pointer-events-none select-none ${variantStyles} ${sizeStyles} ${className}`}
      {...props}
    >
      {loading ? (
        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : (
        icon
      )}
      {children}
    </button>
  );
}
