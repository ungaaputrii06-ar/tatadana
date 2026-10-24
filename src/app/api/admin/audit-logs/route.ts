import { NextResponse } from 'next/server';
import { mockStore } from '@/lib/supabase/mock-store';
import { dataStore } from '@/lib/storage-mock';

export async function GET() {
  const merged: any[] = [];
  const seenIds = new Set<string>();

  // 1. Logs from dataStore
  for (const log of dataStore.auditLogs) {
    if (!seenIds.has(log.id)) {
      seenIds.add(log.id);
      merged.push({
        id: log.id,
        admin_id: log.adminId || log.admin_id || 'adm_unga_01',
        adminName: log.adminName || 'Unga Putri (Superadmin)',
        action: log.action,
        target_user_id: log.targetUserId || log.target_user_id,
        targetUserName: log.targetUserName || 'User',
        details: log.details,
        created_at: log.createdAt || log.created_at || new Date().toISOString(),
      });
    }
  }

  // 2. Logs from mockStore
  for (const log of mockStore.auditLogs) {
    if (!seenIds.has(log.id)) {
      seenIds.add(log.id);
      merged.push({
        id: log.id,
        admin_id: log.admin_id,
        adminName: log.admin_id.includes('unga') ? 'Unga Putri (Superadmin)' : 'Super Admin',
        action: log.action,
        target_user_id: log.target_user_id,
        targetUserName: 'User',
        details: log.details,
        created_at: log.created_at || new Date().toISOString(),
      });
    }
  }

  const logs = merged.sort(
    (a, b) => new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime()
  );

  return NextResponse.json({ ok: true, logs });
}
