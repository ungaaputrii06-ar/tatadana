import { NextResponse } from 'next/server';
import { mockStore } from '@/lib/supabase/mock-store';
import { dataStore } from '@/lib/storage-mock';

export async function GET() {
  const mergedUsersMap = new Map<string, any>();

  // Add from mockStore
  Array.from(mockStore.profiles.values()).forEach((u) => {
    mergedUsersMap.set(u.id, { ...u });
  });

  // Add from dataStore if not already present
  if (dataStore.users && Array.isArray(dataStore.users)) {
    dataStore.users.forEach((u) => {
      if (!mergedUsersMap.has(u.id)) {
        mergedUsersMap.set(u.id, { ...u });
      }
    });
  }

  const users = Array.from(mergedUsersMap.values()).map((u) => {
    const userTxs = mockStore.getTransactionsByUser(u.id);
    const userWallets = mockStore.getWalletsByUser(u.id);
    const totalBalance = userWallets.reduce((sum, w) => sum + (w.balance || 0), 0);

    return {
      ...u,
      transaction_count: userTxs.length,
      wallet_count: userWallets.length > 0 ? userWallets.length : 1,
      wallets: userWallets.length > 0 ? userWallets : [
        { id: `w_${u.id}`, name: 'Dompet Utama', balance: 0, type: 'cash', is_default: true }
      ],
      total_balance: totalBalance,
      transactions: userTxs.slice(0, 10),
      is_whatsapp_verified: u.is_whatsapp_verified ?? u.whatsapp_verified ?? u.is_phone_verified ?? true,
      whatsapp_verified: u.whatsapp_verified ?? u.is_whatsapp_verified ?? u.is_phone_verified ?? true,
      registration_date: u.registration_date || u.created_at || u.createdAt || new Date().toISOString(),
    };
  });

  return NextResponse.json({ users });
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { userId, plan, role, status, approval_status, action, adminId } = body;
    const user = mockStore.profiles.get(userId);
    if (!user) return NextResponse.json({ error: 'User tidak ditemukan' }, { status: 404 });

    const auditId = 'aud-' + Math.random().toString(36).substring(2, 9);
    const performedBy = adminId || 'adm_unga_01';
    let auditAction = 'UPDATE_USER_PROFILE';
    let auditDetails = `Superadmin memperbarui profil ${user.full_name || user.id}`;

    // 1. Handle Approve Registration
    if (action === 'approve' || status === 'approved' || approval_status === 'approved') {
      user.status = 'approved';
      user.approval_status = 'approved';
      auditAction = 'APPROVE_USER_REGISTRATION';
      auditDetails = `Superadmin Unga Putri MENYETUJUI pendaftaran akun ${user.full_name || user.email}`;
    }
    // 2. Handle Reject Registration
    else if (action === 'reject' || status === 'rejected' || approval_status === 'rejected') {
      user.status = 'rejected';
      user.approval_status = 'rejected';
      auditAction = 'REJECT_USER_REGISTRATION';
      auditDetails = `Superadmin Unga Putri MENOLAK pendaftaran akun ${user.full_name || user.email}`;
    }

    if (plan) {
      user.plan = plan;
      user.subscriptionPlan = plan;
      if (userId === dataStore.user.id || (user as any).email === dataStore.user.email) {
        dataStore.user.plan = plan;
        dataStore.user.subscriptionPlan = plan;
      }
      auditAction = 'UPDATE_USER_PLAN';
      auditDetails = `Ubah paket user ${user.full_name} menjadi ${plan.toUpperCase()}`;
    }

    if (role) {
      user.role = role;
      if (userId === dataStore.user.id || (user as any).email === dataStore.user.email) {
        dataStore.user.role = role;
      }
    }

    user.updated_at = new Date().toISOString();

    // Also synchronize dataStore.users list
    if (dataStore.users && Array.isArray(dataStore.users)) {
      const dsUser = dataStore.users.find((u) => u.id === userId);
      if (dsUser) {
        if (action === 'approve' || status === 'approved' || approval_status === 'approved') {
          dsUser.status = 'approved';
          dsUser.approval_status = 'approved';
        } else if (action === 'reject' || status === 'rejected' || approval_status === 'rejected') {
          dsUser.status = 'rejected';
          dsUser.approval_status = 'rejected';
        }
        if (plan) {
          dsUser.plan = plan;
          dsUser.subscriptionPlan = plan;
        }
        if (role) {
          dsUser.role = role;
        }
        dsUser.updated_at = user.updated_at;
      }
    }

    // Log admin audit action in both stores
    mockStore.auditLogs.unshift({
      id: auditId,
      admin_id: performedBy,
      action: auditAction,
      target_user_id: user.id,
      details: { action: auditAction, details: auditDetails, userId: user.id, updatedBy: 'Unga Putri (Superadmin)' },
      created_at: new Date().toISOString(),
    });

    dataStore.auditLogs.unshift({
      id: auditId,
      admin_id: performedBy,
      adminId: performedBy,
      adminName: 'Unga Putri (Superadmin)',
      action: auditAction,
      target_user_id: user.id,
      targetUserId: user.id,
      targetUserName: user.full_name || 'User',
      details: auditDetails,
      created_at: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json({ success: true, ok: true, user });
  } catch (error) {
    return NextResponse.json({ error: 'Gagal update user' }, { status: 500 });
  }
}
