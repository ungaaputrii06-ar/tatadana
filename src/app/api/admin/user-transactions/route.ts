import { NextResponse } from 'next/server';
import { mockStore } from '@/lib/supabase/mock-store';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const targetUserId = searchParams.get('userId');
  const adminId = searchParams.get('adminId') || 'admin-001';

  if (!targetUserId) {
    return NextResponse.json({ error: 'targetUserId is required' }, { status: 400 });
  }

  const targetUser = mockStore.profiles.get(targetUserId);
  if (!targetUser) {
    return NextResponse.json({ error: 'User tidak ditemukan' }, { status: 404 });
  }

  // Mandatory Audit Log entry
  mockStore.auditLogs.unshift({
    id: 'aud-' + Math.random().toString(36).substring(2, 9),
    admin_id: adminId,
    action: 'INSPECT_USER_TRANSACTIONS',
    target_user_id: targetUserId,
    details: {
      target_user_name: targetUser.full_name,
      target_user_phone: targetUser.phone_number,
      timestamp: new Date().toISOString(),
    },
    created_at: new Date().toISOString(),
  });

  const transactions = mockStore.getTransactionsByUser(targetUserId);

  return NextResponse.json({
    user: targetUser,
    transactions,
  });
}
