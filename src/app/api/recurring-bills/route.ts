import { NextRequest, NextResponse } from 'next/server';
import { RecurringBill } from '@/lib/types';

// In-memory persistent recurring bills store for seamless local and production operation
let recurringBillsStore: RecurringBill[] = [
  {
    id: 'rec_01',
    userId: 'usr_budi_01',
    user_id: 'usr_budi_01',
    name: 'Tagihan Listrik PLN',
    amount: 650000,
    category_id: 'cat_bill',
    categoryId: 'cat_bill',
    due_date: '20',
    dueDate: '20',
    frequency: 'monthly',
    status: 'active',
    notes: 'Jatuh tempo setiap tanggal 20',
    created_at: new Date().toISOString()
  },
  {
    id: 'rec_02',
    userId: 'usr_budi_01',
    user_id: 'usr_budi_01',
    name: 'Internet & TV Kabel IndiHome',
    amount: 385000,
    category_id: 'cat_bill',
    categoryId: 'cat_bill',
    due_date: '15',
    dueDate: '15',
    frequency: 'monthly',
    status: 'active',
    notes: 'Pembayaran rutin tanggal 15',
    created_at: new Date().toISOString()
  },
  {
    id: 'rec_03',
    userId: 'usr_budi_01',
    user_id: 'usr_budi_01',
    name: 'Langganan Spotify & Netflix',
    amount: 189000,
    category_id: 'cat_ent',
    categoryId: 'cat_ent',
    due_date: '05',
    dueDate: '05',
    frequency: 'monthly',
    status: 'paid',
    notes: 'Auto debit tanggal 5',
    created_at: new Date().toISOString()
  }
];

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('userId') || 'usr_budi_01';

  const userBills = recurringBillsStore.filter((b) => (b.userId || b.user_id) === userId);
  return NextResponse.json({ ok: true, bills: userBills });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, amount, categoryId, dueDate, frequency = 'monthly', notes, userId = 'usr_budi_01' } = body;

    if (!name || !amount) {
      return NextResponse.json({ ok: false, error: 'Nama dan nominal tagihan wajib diisi.' }, { status: 400 });
    }

    const newBill: RecurringBill = {
      id: 'rec_' + Date.now(),
      userId,
      user_id: userId,
      name,
      amount: Number(amount),
      categoryId,
      category_id: categoryId,
      dueDate: String(dueDate || '1'),
      due_date: String(dueDate || '1'),
      frequency,
      status: 'active',
      notes,
      created_at: new Date().toISOString()
    };

    recurringBillsStore.unshift(newBill);
    return NextResponse.json({ ok: true, bill: newBill });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
