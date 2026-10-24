import { NextResponse } from 'next/server';
import { mockStore } from '@/lib/supabase/mock-store';
import { MidtransClient } from '@/lib/midtrans/client';

export async function POST(request: Request) {
  try {
    const { userId, plan, isManualTransfer } = await request.json();

    const user = mockStore.profiles.get(userId || 'user-starter-123');
    if (!user) {
      return NextResponse.json({ error: 'User tidak ditemukan' }, { status: 404 });
    }

    const price = plan === 'pro' ? 99000 : 49000;
    const planName = plan === 'pro' ? 'TataDana Pro (Sekali Bayar)' : 'TataDana Starter (Bulanan)';
    const orderId = `TD-${plan.toUpperCase()}-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 1000)}`;

    if (isManualTransfer) {
      // Manual Bank Transfer flow
      const payRecord = {
        id: 'pay-' + Math.random().toString(36).substring(2, 9),
        user_id: user.id,
        order_id: orderId,
        amount: price,
        plan: plan as 'starter' | 'pro',
        status: 'manual_pending' as const,
        payment_type: 'manual_bank_transfer',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      mockStore.payments.set(payRecord.id, payRecord);

      return NextResponse.json({
        success: true,
        orderId,
        amount: price,
        isManual: true,
        bankDetails: {
          bank: 'BCA',
          accountNumber: '8730-1294-81',
          accountName: 'PT TATADANA FINANSIAL NUSANTARA',
        },
      });
    }

    // Midtrans Snap flow
    const midtrans = new MidtransClient();
    const snap = await midtrans.createSnapTransaction({
      orderId,
      grossAmount: price,
      customerDetails: {
        first_name: user.full_name || user.fullName || 'User',
        phone: user.phone_number || user.phoneNumber || '081234567890',
        email: user.email || 'user@tatadana.id',
      },
      itemDetails: [
        {
          id: plan,
          price,
          quantity: 1,
          name: planName,
        },
      ],
    });

    const payRecord = {
      id: 'pay-' + Math.random().toString(36).substring(2, 9),
      user_id: user.id,
      order_id: orderId,
      amount: price,
      plan: plan as 'starter' | 'pro',
      status: 'pending' as const,
      payment_type: 'midtrans_snap',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    mockStore.payments.set(payRecord.id, payRecord);

    return NextResponse.json({
      success: true,
      orderId,
      snapToken: snap.token,
      redirectUrl: snap.redirect_url,
    });
  } catch (error) {
    console.error('Payment creation error:', error);
    return NextResponse.json({ error: 'Gagal inisiasi pembayaran' }, { status: 500 });
  }
}
