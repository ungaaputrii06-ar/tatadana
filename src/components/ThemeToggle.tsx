'use client';

import React, { useEffect, useState } from 'react';
import { Sun, Moon } from 'lucide-react';

export default function ThemeToggle() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const savedTheme = typeof window !== 'undefined' ? localStorage.getItem('tatadana_theme') : null;
    const initialDark = savedTheme === 'dark';
    setIsDark(initialDark);
    applyTheme(initialDark);
  }, []);

  const applyTheme = (dark: boolean) => {
    const root = document.documentElement;
    if (dark) {
      root.classList.add('dark');
      root.classList.remove('light');
      document.body.style.backgroundColor = '#090D16';
      document.body.style.color = '#F8FAFC';
    } else {
      root.classList.remove('dark');
      root.classList.add('light');
      document.body.style.backgroundColor = '#0F172A';
      document.body.style.color = '#F8FAFC';
    }
  };

  const toggleTheme = () => {
    const nextDark = !isDark;
    setIsDark(nextDark);
    if (typeof window !== 'undefined') {
      localStorage.setItem('tatadana_theme', nextDark ? 'dark' : 'light');
    }
    applyTheme(nextDark);
  };

  return (
    <button
      onClick={toggleTheme}
      className={`p-2 rounded-xl border transition-all flex items-center gap-1.5 text-xs font-medium shadow-xs ${
        isDark
          ? 'bg-slate-900 hover:bg-slate-800 text-cyan-400 border-slate-700'
          : 'bg-[#0F172A] hover:bg-slate-800 text-cyan-400 border-slate-700'
      }`}
      title="Beralih Tema TataDana (Electric Blue & Obsidian Slate)"
      aria-label="Toggle theme"
    >
      {isDark ? (
        <>
          <Sun className="w-4 h-4 text-cyan-400" />
          <span className="hidden sm:inline text-slate-300">Light</span>
        </>
      ) : (
        <>
          <Moon className="w-4 h-4 text-blue-500" />
          <span className="hidden sm:inline text-slate-200 font-semibold">Dark</span>
        </>
      )}
    </button>
  );
}
