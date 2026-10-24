import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  hoverEffect?: boolean;
}

export function Card({ children, className = '', hoverEffect = false, ...props }: CardProps) {
  return (
    <div
      className={`bg-[#0F172A] rounded-2xl border border-slate-800/90 shadow-lg p-5 md:p-6 transition-all duration-200 text-slate-100 ${
        hoverEffect ? 'hover:shadow-xl hover:border-cyan-500/40 hover:-translate-y-0.5' : ''
      } ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`flex items-center justify-between pb-4 mb-4 border-b border-slate-800 ${className}`}>{children}</div>;
}

export function CardTitle({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <h3 className={`text-base font-bold text-white tracking-tight ${className}`}>{children}</h3>;
}
