'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Send } from 'lucide-react';
import TeamworkPreviewPage from '@/app/dashboard/teamwork/page';

export default function StandaloneTeamworkPreview() {
  return (
    <div className="min-h-screen bg-[#090D16] text-[#F8FAFC] p-4 sm:p-6 lg:p-10">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Top Navbar */}
        <div className="flex items-center justify-between pb-6 border-b border-slate-800">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-400 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <Send className="w-4 h-4 -rotate-12 translate-x-0.5" />
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-lg tracking-tight text-white">
                Tata<span className="text-cyan-400">Dana</span>
              </span>
              <span className="text-[10px] text-slate-400 -mt-1 font-semibold">TEAMWORK PREVIEW (10 TIM)</span>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            <Link
              href="/dashboard/teamwork"
              className="text-xs px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 transition-colors shadow-xs font-semibold"
            >
              Buka di Dashboard &rarr;
            </Link>
            <Link
              href="/dashboard"
              className="text-xs px-3.5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 text-white font-semibold shadow-md shadow-blue-500/25 transition-all"
            >
              Ke Dashboard
            </Link>
          </div>
        </div>

        {/* Embedded 10 People / 10 Teams Preview Component */}
        <TeamworkPreviewPage />
      </div>
    </div>
  );
}
