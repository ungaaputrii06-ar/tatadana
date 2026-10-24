'use client';

import React, { useState, useEffect } from 'react';
import { History, ShieldAlert, Lock, CheckCircle2 } from 'lucide-react';
import { AdminAuditLog } from '@/lib/types';
import { formatWIBDate, formatWIBTime } from '@/lib/utils/date';

export default function AdminAuditLogsPage() {
  const [logs, setLogs] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/admin/audit-logs')
      .then((res) => res.json())
      .then((data) => setLogs(data.logs || []))
      .catch(console.error);
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
          <History className="w-7 h-7 text-cyan-400" />
          Log Audit Tindakan Superadmin
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          Rekaman immutable setiap kali admin mengakses data sensitif pengguna, mengubah paket, menyetujui transfer, atau impersonasi.
        </p>
      </div>

      <div className="bg-[#0F172A] rounded-2xl border border-slate-800 shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm border-collapse">
            <thead>
              <tr className="bg-slate-900/80 border-b border-slate-800 text-slate-400 font-semibold text-xs uppercase tracking-wider">
                <th className="py-3 px-4">Waktu (WIB)</th>
                <th className="py-3 px-4">Admin</th>
                <th className="py-3 px-4">Tindakan (Action)</th>
                <th className="py-3 px-4">Target User</th>
                <th className="py-3 px-4">Rincian Perubahan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 text-slate-200">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-slate-500">
                    Belum ada audit log tindakan admin.
                  </td>
                </tr>
              ) : (
                logs.map((l) => (
                  <tr key={l.id} className="hover:bg-blue-950/20 transition-colors">
                    <td className="py-3.5 px-4 font-mono text-slate-400 whitespace-nowrap text-xs">
                      {formatWIBDate(l.created_at || l.createdAt || new Date().toISOString())} {formatWIBTime(l.created_at || l.createdAt || new Date().toISOString())}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-white">
                      {l.adminName || l.admin_id || l.adminId || 'Unga Putri'}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-cyan-400">
                      <span className="px-2 py-0.5 rounded-md bg-blue-950/70 border border-cyan-800/60 text-[11px] font-mono">
                        {l.action}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-xs text-slate-400">
                      {l.targetUserName || l.target_user_id || l.targetUserId || '-'}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-300">
                      {typeof l.details === 'string' ? l.details : JSON.stringify(l.details || {})}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
