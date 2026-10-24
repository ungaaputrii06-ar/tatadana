import { NextResponse } from 'next/server';
import { mockStore } from '@/lib/supabase/mock-store';

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const { order_id, transaction_status, fraud_status, payment_type, transaction_id } = payload;

    if (!order_id) {
      return NextResponse.json({ error: 'order_id is required' }, { status: 400 });
    }

    // Find payment record
    let paymentRecord = Array.from(mockStore.payments.values()).find((p) => p.order_id === order_id);

    if (!paymentRecord) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    let isSuccess = false;
    if (transaction_status === 'capture') {
      isSuccess = fraud_status === 'accept';
    } else if (transaction_status === 'settlement') {
      isSuccess = true;
    }

    if (isSuccess) {
      paymentRecord.status = 'success';
      paymentRecord.midtrans_transaction_id = transaction_id;
      paymentRecord.payment_type = payment_type;
      paymentRecord.updated_at = new Date().toISOString();

      // Upgrade user plan
      const targetUserId = paymentRecord.user_id || paymentRecord.userId;
      if (targetUserId) {
        const user = mockStore.profiles.get(targetUserId);
        if (user) {
          user.plan = paymentRecord.plan;
          user.updated_at = new Date().toISOString();
        }
      }
    } else if (['cancel', 'deny', 'expire'].includes(transaction_status)) {
      paymentRecord.status = 'failed';
      paymentRecord.updated_at = new Date().toISOString();
    }

    return NextResponse.json({ ok: true, status: paymentRecord.status });
  } catch (error) {
    console.error('Midtrans Webhook Error:', error);
    return NextResponse.json({ error: 'Internal webhook error' }, { status: 500 });
  }
}
