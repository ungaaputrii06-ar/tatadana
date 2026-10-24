'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  CreditCard,
  BarChart3,
  Target,
  Wallet as WalletIcon,
  Calendar,
  Settings,
  Send,
  LogOut,
  Sparkles,
  Bot,
  Shield,
  ExternalLink,
  Users
} from 'lucide-react';
import { dataStore } from '@/lib/storage-mock';

interface SidebarProps {
  onOpenBotSimulator?: () => void;
}

export default function Sidebar({ onOpenBotSimulator }: SidebarProps) {
  const pathname = usePathname();
  const [userProfile, setUserProfile] = React.useState({
    fullName: dataStore.user.fullName || 'Bunga Putri',
    email: dataStore.user.email || 'bungaputri@gmail.com',
    avatarUrl: dataStore.user.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    plan: dataStore.user.subscriptionPlan || 'pro',
    transactionsThisMonth: dataStore.user.transactionsThisMonth || 18,
  });

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedName = localStorage.getItem('tatadana_user_name');
      const savedEmail = localStorage.getItem('tatadana_user_email');
      const savedAvatar = localStorage.getItem('tatadana_user_avatar');
      if (savedName || savedAvatar || savedEmail) {
        setUserProfile((prev) => ({
          ...prev,
          fullName: savedName || prev.fullName,
          email: savedEmail || prev.email,
          avatarUrl: savedAvatar || prev.avatarUrl,
        }));
      }
    }

    const handleProfileUpdate = (e: any) => {
      const detail = e.detail;
      if (detail) {
        setUserProfile((prev) => ({
          ...prev,
          fullName: detail.fullName || prev.fullName,
          email: detail.email || prev.email,
          avatarUrl: detail.avatarUrl || prev.avatarUrl,
        }));
      } else {
        setUserProfile({
          fullName: dataStore.user.fullName || 'Bunga Putri',
          email: dataStore.user.email || 'bungaputri@gmail.com',
          avatarUrl: dataStore.user.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
          plan: dataStore.user.subscriptionPlan || 'pro',
          transactionsThisMonth: dataStore.user.transactionsThisMonth || 18,
        });
      }
    };

    window.addEventListener('tatadana_profile_updated', handleProfileUpdate);
    window.addEventListener('tatadana_data_updated', handleProfileUpdate);
    return () => {
      window.removeEventListener('tatadana_profile_updated', handleProfileUpdate);
      window.removeEventListener('tatadana_data_updated', handleProfileUpdate);
    };
  }, []);

  const navSections = [
    {
      title: 'MENU UTAMA',
      items: [
        { label: 'Beranda', href: '/dashboard', icon: Home, emoji: '🏠' },
        { label: 'Transaksi', href: '/dashboard/transactions', altHref: '/dashboard/transaksi', icon: CreditCard, emoji: '💳' },
        { label: 'Laporan', href: '/dashboard/reports', altHref: '/dashboard/laporan', icon: BarChart3, emoji: '📊' },
      ]
    },
    {
      title: 'KEUANGAN & DOMPET',
      items: [
        { label: 'Wallet & Dompet', href: '/dashboard/wallets', altHref: '/dashboard/wallet', icon: WalletIcon, emoji: '👛' },
        { label: 'Budget & Anggaran', href: '/dashboard/budgets', altHref: '/dashboard/budget', icon: Target, emoji: '🎯' },
        { label: 'Kalender Keuangan', href: '/dashboard/calendar', icon: Calendar, emoji: '📅' },
      ]
    },
    {
      title: 'ASISTEN PINTAR & BOT',
      items: [
        { label: 'Tata AI Bot', href: '/dashboard/tata-ai', icon: Bot, emoji: '🧠' },
        { label: 'Simulator Bot', href: '/dashboard/simulator', icon: Bot, emoji: '💬' },
        { label: 'Tim Kolaboratif', href: '/dashboard/teamwork', icon: Users, emoji: '👥' },
      ]
    },
    {
      title: 'SISTEM & AKUN',
      items: [
        { label: 'Settings', href: '/dashboard/settings', icon: Settings, emoji: '⚙️' },
        { label: 'Panel Admin', href: '/admin', icon: Shield, emoji: '🛡️' },
      ]
    }
  ];

  return (
    <aside className="w-64 bg-[#0B0F19] border-r border-slate-800/90 flex flex-col justify-between h-screen sticky top-0 shrink-0 shadow-2xl transition-colors">
      {/* Brand Header */}
      <div>
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-400 flex items-center justify-center text-white shadow-md shadow-blue-500/25">
              <Send className="w-4 h-4 -rotate-12 translate-x-0.5" />
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-lg tracking-tight text-white">
                Tata<span className="text-cyan-400">Dana</span>
              </span>
              <span className="text-[10px] text-slate-400 -mt-1 font-semibold">FINTECH APP</span>
            </div>
          </Link>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-950/70 text-cyan-400 border border-cyan-800/60 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            Online
          </span>
        </div>

        {/* Telegram Bot Live Interactive Trigger */}
        <div className="p-3">
          <button
            onClick={onOpenBotSimulator}
            className="w-full bg-blue-950/40 hover:bg-blue-900/40 border border-blue-800/60 rounded-xl p-2.5 text-left transition-all group shadow-sm hover:border-cyan-500/50"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-blue-600 to-cyan-500 text-white flex items-center justify-center shadow-sm">
                  <Bot className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-200 group-hover:text-cyan-400 flex items-center gap-1">
                    Telegram Simulator
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  </div>
                  <div className="text-[10px] text-slate-400">@keuanganunga_bot</div>
                </div>
              </div>
              <ExternalLink className="w-3.5 h-3.5 text-slate-500 group-hover:text-cyan-400" />
            </div>
          </button>
        </div>

        {/* Grouped Navigation Items */}
        <nav className="px-3 space-y-3.5 overflow-y-auto max-h-[calc(100vh-270px)] custom-scrollbar">
          {navSections.map((sec, sIdx) => (
            <div key={sIdx} className="space-y-1">
              <div className="px-3 text-[10px] font-bold tracking-wider text-slate-500 uppercase">
                {sec.title}
              </div>
              <div className="space-y-0.5">
                {sec.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href || (item.altHref && pathname === item.altHref);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                        isActive
                          ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-md shadow-blue-500/25 font-bold'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                      }`}
                    >
                      <span className="text-xs">{item.emoji}</span>
                      <span className="truncate">{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </div>

      {/* User Plan Badge & Profile Footer */}
      <div className="p-4 border-t border-slate-800 space-y-3 bg-[#080B13]">
        {/* Plan Badge */}
        <div className="bg-[#0F172A] border border-slate-800 rounded-xl p-2.5 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-blue-950/80 text-cyan-400 flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            <div>
              <div className="text-xs font-bold text-white capitalize flex items-center gap-1">
                Paket {userProfile.plan}
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-400 font-semibold border border-cyan-800/60">
                  {userProfile.plan === 'pro' ? 'Lifetime' : 'Active'}
                </span>
              </div>
              <div className="text-[10px] text-slate-400">
                {userProfile.plan === 'pro' ? 'Unlimited Transaksi' : `${userProfile.transactionsThisMonth}/50 transaksi`}
              </div>
            </div>
          </div>
        </div>

        {/* Profile Card */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <img
              src={userProfile.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
              alt={userProfile.fullName}
              className="w-9 h-9 rounded-full object-cover border-2 border-cyan-400 shrink-0 shadow-sm"
            />
            <div className="overflow-hidden">
              <div className="text-xs font-bold text-white truncate">{userProfile.fullName}</div>
              <div className="text-[10px] text-slate-400 truncate">{userProfile.email}</div>
            </div>
          </div>
          <Link
            href="/"
            title="Keluar"
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </aside>
  );
}
