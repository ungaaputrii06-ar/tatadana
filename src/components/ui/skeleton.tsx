import React from 'react';

export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div
      className={`animate-pulse bg-surface-200/70 rounded-lg ${className}`}
    />
  );
}
