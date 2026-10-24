'use client';

import React, { useState } from 'react';
import Sidebar from '@/components/Sidebar';
import TelegramSimulatorModal from '@/components/TelegramSimulatorModal';
import TataAiDrawer from '@/components/TataAiDrawer';
import { Menu, Bot, Plus, Sparkles } from 'lucide-react';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isBotOpen, setIsBotOpen] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [drawerDate, setDrawerDate] = useState<string | undefined>();
  const [drawerWalletId, setDrawerWalletId] = useState<string | undefined>();

  React.useEffect(() => {
    const handleOpenBot = () => setIsBotOpen(true);
    const handleOpenDrawer = (e: any) => {
      if (e?.detail?.date) setDrawerDate(e.detail.date);
      if (e?.detail?.walletId) setDrawerWalletId(e.detail.walletId);
      setIsDrawerOpen(true);
    };

    window.addEventListener('tatadana_open_bot_simulator', handleOpenBot);
    window.addEventListener('tatadana_open_tata_ai_drawer', handleOpenDrawer);

    return () => {
      window.removeEventListener('tatadana_open_bot_simulator', handleOpenBot);
      window.removeEventListener('tatadana_open_tata_ai_drawer', handleOpenDrawer);
    };
  }, []);

  return (
    <div className="flex min-h-screen bg-[#090D16] text-[#F8FAFC] transition-colors">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block no-print">
        <Sidebar onOpenBotSimulator={() => setIsBotOpen(true)} />
      </div>

      {/* Mobile Drawer */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs" onClick={() => setMobileSidebarOpen(false)} />
          <div className="relative z-10 w-64 bg-[#0B0F19] shadow-2xl">
            <Sidebar onOpenBotSimulator={() => { setMobileSidebarOpen(false); setIsBotOpen(true); }} />
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Mobile Topbar */}
        <header className="lg:hidden sticky top-0 z-30 bg-[#0B0F19] border-b border-slate-800 px-4 py-3 flex items-center justify-between no-print shadow-md">
          <button
            onClick={() => setMobileSidebarOpen(true)}
            className="p-2 rounded-xl bg-slate-900 text-slate-300 hover:text-white border border-slate-800"
          >
            <Menu className="w-5 h-5" />
          </button>
          <span className="font-extrabold text-white flex items-center gap-1">
            Tata<span className="text-cyan-400">Dana</span>
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsDrawerOpen(true)}
              className="p-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-sm"
              title="Catat Cepat Tata AI"
            >
              <Plus className="w-4 h-4" />
            </button>
            <button
              onClick={() => setIsBotOpen(true)}
              className="p-2 rounded-xl bg-slate-800 text-cyan-400 border border-slate-700 shadow-sm"
              title="Buka Telegram Simulator"
            >
              <Bot className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Child Pages */}
        <main className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full flex-1">
          {children}
        </main>
      </div>

      {/* Floating Action Launchers (Always Accessible on Dashboard) */}
      <div className="fixed bottom-6 right-6 z-40 no-print flex flex-col items-end gap-2.5">
        {/* Quick Entry Drawer Button */}
        <button
          onClick={() => setIsDrawerOpen(true)}
          className="flex items-center gap-2 px-3.5 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white rounded-full shadow-lg shadow-cyan-500/20 hover:scale-105 active:scale-95 transition-all group font-bold text-xs"
          title="Catat Transaksi Cepat / Tata AI"
        >
          <Sparkles className="w-4 h-4 text-white" />
          <span className="hidden sm:inline">Tata AI Quick Entry</span>
          <span className="sm:hidden">Catat</span>
        </button>

        {/* Floating Bot Simulator Launcher */}
        <button
          onClick={() => setIsBotOpen(true)}
          className="flex items-center gap-2.5 px-4 py-3 bg-[#0B0F19] hover:bg-slate-900 text-white border border-slate-800 hover:border-cyan-500/60 rounded-full shadow-2xl shadow-blue-500/20 hover:scale-105 active:scale-95 transition-all group"
          title="Buka Simulator Bot TataDana"
        >
          <div className="relative">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-cyan-400 flex items-center justify-center text-white shadow-md">
              <Bot className="w-4 h-4" />
            </div>
            <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 border-2 border-black rounded-full animate-pulse" />
          </div>
          <div className="text-left hidden sm:block">
            <div className="text-xs font-bold flex items-center gap-1.5 text-white">
              Simulator Bot
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-cyan-950/80 text-cyan-400 border border-cyan-800/60 font-mono">
                Online
              </span>
            </div>
            <div className="text-[10px] text-slate-400">Tata dana bunga</div>
          </div>
        </button>
      </div>

      {/* Global Tata AI Quick Entry Drawer */}
      <TataAiDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        initialDate={drawerDate}
        initialWalletId={drawerWalletId}
        onTransactionAdded={() => {
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('tatadana_data_updated'));
          }
        }}
      />

      {/* Global Telegram Bot Interactive Simulator */}
      <TelegramSimulatorModal
        isOpen={isBotOpen}
        onClose={() => setIsBotOpen(false)}
        onTransactionAdded={() => {
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('tatadana_data_updated'));
          }
        }}
      />
    </div>
  );
}
