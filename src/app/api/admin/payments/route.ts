import { NextRequest, NextResponse } from 'next/server';
import { dataStore } from '@/lib/storage-mock';
import { mockStore } from '@/lib/supabase/mock-store';

export async function GET() {
  try {
    // Unify payments from both dataStore and mockStore
    const list: any[] = [];
    const seenIds = new Set<string>();

    for (const p of dataStore.payments) {
      if (!seenIds.has(p.id)) {
        seenIds.add(p.id);
        list.push({
          ...p,
          payment_type: p.paymentMethod || (p as any).payment_type || 'manual_transfer',
          user: p.user || { full_name: p.userName || 'User', phone_number: '+628123456789' }
        });
      }
    }

    for (const p of Array.from(mockStore.payments.values())) {
      if (!seenIds.has(p.id)) {
        seenIds.add(p.id);
        list.push(p);
      }
    }

    return NextResponse.json({ ok: true, payments: list });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { paymentId, action, adminId } = await req.json();

    let payment = dataStore.payments.find(p => p.id === paymentId || p.orderId === paymentId || (p as any).order_id === paymentId);
    let mockPayment = mockStore.payments.get(paymentId);
    if (!mockPayment) {
      for (const p of Array.from(mockStore.payments.values())) {
        if (p.order_id === paymentId || p.id === paymentId) {
          mockPayment = p;
          break;
        }
      }
    }

    // Cross-store link by userId if ID formats differ (e.g., pay_02 vs pay-003)
    if (!mockPayment && payment) {
      const pUid = payment.userId || (payment as any).user_id;
      for (const p of Array.from(mockStore.payments.values())) {
        if (p.user_id === pUid && (p.status === 'pending' || (p as any).status === 'manual_pending')) {
          mockPayment = p;
          break;
        }
      }
    }
    if (!payment && mockPayment) {
      payment = dataStore.payments.find(p => (p.userId === mockPayment!.user_id || (p as any).user_id === mockPayment!.user_id) && p.status === 'pending');
    }

    if (!payment && !mockPayment) {
      return NextResponse.json({ ok: false, error: 'Pembayaran tidak ditemukan.' }, { status: 404 });
    }

    const currentAdmin = adminId || 'adm_unga_01';
    const currentAdminName = 'Unga Putri (Superadmin)';

    const targetUserId = payment?.userId || payment?.user_id || mockPayment?.user_id || (mockPayment as any)?.user?.id || dataStore.user.id;
    const targetUserName = payment?.userName || (payment as any)?.user?.full_name || mockPayment?.user?.full_name || 'User';
    const targetOrderId = payment?.orderId || (payment as any)?.order_id || mockPayment?.order_id || 'ORDER';

    if (action === 'approve') {
      if (payment) payment.status = 'approved_manual';
      if (mockPayment) mockPayment.status = 'success';

      // Upgrade user in dataStore
      if (dataStore.user.id === targetUserId || payment?.userId === dataStore.user.id) {
        dataStore.user.subscriptionPlan = 'pro';
        dataStore.user.plan = 'pro';
      }

      // Upgrade user in mockStore
      const mockProfile = mockStore.profiles.get(targetUserId);
      if (mockProfile) {
        mockProfile.plan = 'pro';
        mockProfile.subscriptionPlan = 'pro';
      }

      // Record audit log in dataStore
      dataStore.auditLogs.unshift({
        id: 'aud_' + Date.now(),
        admin_id: currentAdmin,
        adminId: currentAdmin,
        adminName: currentAdminName,
        action: 'APPROVE_PAYMENT',
        target_user_id: targetUserId,
        targetUserId: targetUserId,
        targetUserName: targetUserName,
        details: `Disetujui pembayaran manual order ${targetOrderId} (Plan PRO Lifetime)`,
        created_at: new Date().toISOString(),
        createdAt: new Date().toISOString()
      });

      // Record audit log in mockStore
      mockStore.auditLogs.unshift({
        id: 'aud-' + Math.random().toString(36).substring(2, 9),
        admin_id: currentAdmin,
        action: 'APPROVE_PAYMENT',
        target_user_id: targetUserId,
        details: { orderId: targetOrderId, plan: 'pro', approvedBy: currentAdminName },
        created_at: new Date().toISOString()
      });

      // Dispatch Telegram confirmation notification if user has connected Telegram
      const targetUser = mockProfile || (dataStore.user.id === targetUserId ? dataStore.user : undefined);
      const telegramChatId = targetUser?.telegram_chat_id || targetUser?.telegramChatId || targetUser?.telegram_user_id;

      let telegramNotifSent = false;
      const proSuccessMessage = `🎉 *Selamat! Pembayaran Terverifikasi & Akun Aktif TataDana Pro!*\n` +
        `━━━━━━━━━━━━━━━━━━━━━\n` +
        `Order ID: *${targetOrderId}*\n` +
        `Paket: *TataDana Pro (Lifetime)*\n\n` +
        `Fitur Pro Kamu Sudah Aktif Sekarang:\n` +
        `✨ *Unlimited Transaksi Selamanya* (bebas kuota bulanan)\n` +
        `📸 *Catat Otomatis via Foto Struk Belanja*\n` +
        `🤖 *AI Financial Advisor Proaktif Aktif*\n` +
        `📊 *Laporan Lengkap & Ekspor PDF / Excel*\n\n` +
        `Coba kirim foto struk atau ketik transaksimu sekarang! 💪`;

      if (telegramChatId && process.env.TELEGRAM_BOT_TOKEN) {
        try {
          await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: telegramChatId,
              text: proSuccessMessage,
              parse_mode: 'Markdown'
            })
          });
          telegramNotifSent = true;
        } catch (e) {
          console.warn('Telegram notification dispatch error:', e);
        }
      }

      return NextResponse.json({
        ok: true,
        message: 'Pembayaran berhasil disetujui! Akun pengguna telah ditingkatkan ke Pro (Unlimited).',
        telegramNotifSent
      });
    }

    if (action === 'reject') {
      if (payment) payment.status = 'rejected_manual';
      if (mockPayment) mockPayment.status = 'rejected';

      dataStore.auditLogs.unshift({
        id: 'aud_' + Date.now(),
        admin_id: currentAdmin,
        adminId: currentAdmin,
        adminName: currentAdminName,
        action: 'REJECT_PAYMENT',
        target_user_id: targetUserId,
        targetUserId: targetUserId,
        targetUserName: targetUserName,
        details: `Ditolak pembayaran order ${targetOrderId}`,
        created_at: new Date().toISOString(),
        createdAt: new Date().toISOString()
      });

      mockStore.auditLogs.unshift({
        id: 'aud-' + Math.random().toString(36).substring(2, 9),
        admin_id: currentAdmin,
        action: 'REJECT_PAYMENT',
        target_user_id: targetUserId,
        details: { orderId: targetOrderId, rejectedBy: currentAdminName },
        created_at: new Date().toISOString()
      });

      return NextResponse.json({ ok: true, message: 'Pembayaran berhasil ditolak.' });
    }

    return NextResponse.json({ ok: false, error: 'Aksi tidak valid.' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
