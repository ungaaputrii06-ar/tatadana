'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Send, Menu, X, ArrowRight, ShieldCheck } from 'lucide-react';

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full backdrop-blur-md bg-[#090D16]/90 border-b border-slate-800/90 shadow-lg shadow-black/20 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-400 flex items-center justify-center text-white shadow-md shadow-blue-500/25 group-hover:scale-105 transition-transform">
            <Send className="w-5 h-5 -rotate-12 translate-x-0.5" />
          </div>
          <div className="flex flex-col">
            <span className="font-extrabold text-xl tracking-tight text-white flex items-center gap-1">
              Tata<span className="text-cyan-400">Dana</span>
            </span>
            <span className="text-[10px] text-slate-400 -mt-1 hidden sm:block tracking-wider font-semibold">FINTECH BOT</span>
          </div>
        </Link>

        {/* Desktop Nav Links */}
        <nav className="hidden md:flex items-center gap-7 text-sm font-semibold text-slate-300">
          <a href="#fitur" className="hover:text-cyan-400 transition-colors">Fitur</a>
          <a href="#harga" className="hover:text-cyan-400 transition-colors">Harga</a>
          <a href="#faq" className="hover:text-cyan-400 transition-colors">FAQ</a>
          <Link href="/dashboard" className="text-slate-200 hover:text-cyan-400 flex items-center gap-1 transition-colors">
            Dashboard
          </Link>
          <a
            href="https://t.me/keuanganunga_bot"
            target="_blank"
            rel="noopener noreferrer"
            className="text-cyan-400 hover:text-cyan-300 bg-cyan-950/50 hover:bg-cyan-900/50 border border-cyan-800/60 px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all"
          >
            <Send className="w-3.5 h-3.5" /> Bot Telegram
          </a>
          <Link href="/admin" className="text-blue-400 hover:text-blue-300 flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg border border-blue-800/60 bg-blue-950/50 transition-colors">
            <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" /> Admin
          </Link>
        </nav>

        {/* Right CTA Actions */}
        <div className="hidden md:flex items-center gap-2.5">
          <Link
            href="/auth/login?demo=admin"
            className="text-xs sm:text-sm font-bold text-blue-300 hover:text-white bg-blue-950/60 hover:bg-blue-900/60 border border-blue-800/80 px-3 py-2 rounded-xl transition-all flex items-center gap-1 shadow-xs"
            title="Login Admin Unga Putri (ungaaputrii@gmail.com / 1234)"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
            Login Admin
          </Link>
          <Link
            href="/auth/login?demo=bunga"
            className="text-xs sm:text-sm font-semibold text-slate-200 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-cyan-500/50 px-3.5 py-2 rounded-xl transition-all"
          >
            Masuk (Bunga Putri)
          </Link>
          <Link
            href="/auth/register"
            className="text-xs sm:text-sm font-semibold bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white px-4 py-2 rounded-xl shadow-md shadow-blue-500/25 flex items-center gap-1.5 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            Mulai Gratis
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Mobile Hamburger */}
        <div className="flex items-center gap-2 md:hidden">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-xl text-slate-300 hover:text-white bg-slate-900 border border-slate-800"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-slate-800 bg-[#0B0F19] px-4 pt-3 pb-6 space-y-3 shadow-2xl">
          <a
            href="#fitur"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 text-base font-semibold text-slate-200 hover:text-cyan-400"
          >
            Fitur
          </a>
          <a
            href="#harga"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 text-base font-semibold text-slate-200 hover:text-cyan-400"
          >
            Harga
          </a>
          <a
            href="#faq"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 text-base font-semibold text-slate-200 hover:text-cyan-400"
          >
            FAQ
          </a>
          <Link
            href="/dashboard"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 text-base font-semibold text-slate-200 hover:text-cyan-400"
          >
            Dashboard
          </Link>
          <a
            href="https://t.me/keuanganunga_bot"
            target="_blank"
            rel="noopener noreferrer"
            className="block px-3 py-2 text-base font-semibold text-cyan-400 bg-cyan-950/40 border border-cyan-800/40 rounded-xl"
          >
            🚀 Buka Bot Telegram (@keuanganunga_bot)
          </a>
          <div className="pt-2 flex flex-col gap-2">
            <Link
              href="/auth/login?demo=admin"
              onClick={() => setMobileMenuOpen(false)}
              className="text-center font-bold text-blue-300 bg-blue-950/60 py-2.5 rounded-xl border border-blue-800/80 shadow-xs flex items-center justify-center gap-1.5"
            >
              <ShieldCheck className="w-4 h-4 text-cyan-400" />
              Login Admin (Unga Putri)
            </Link>
            <Link
              href="/auth/login?demo=bunga"
              onClick={() => setMobileMenuOpen(false)}
              className="text-center font-semibold text-slate-300 bg-slate-900 py-2.5 rounded-xl border border-slate-800"
            >
              Masuk (Akun Bunga Putri)
            </Link>
            <Link
              href="/auth/register"
              onClick={() => setMobileMenuOpen(false)}
              className="text-center font-semibold bg-gradient-to-r from-blue-600 to-cyan-500 text-white py-2.5 rounded-xl shadow-md"
            >
              Daftar Gratis
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
