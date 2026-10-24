import { NextRequest, NextResponse } from 'next/server';
import { mockStore } from '@/lib/supabase/mock-store';
import { dataStore } from '@/lib/storage-mock';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const format = searchParams.get('format') || 'json';
  const dateStr = new Date().toISOString().slice(0, 10);

  const users = Array.from(mockStore.profiles.values());
  const transactions = Array.from(mockStore.transactions.values());
  const payments = Array.from(mockStore.payments.values());

  // Aggregate AI logs
  const aiLogs = [...mockStore.aiLogs];
  if (dataStore && Array.isArray(dataStore.aiLogs)) {
    for (const l of dataStore.aiLogs) {
      if (!aiLogs.some(existing => existing.id === l.id)) {
        aiLogs.push(l);
      }
    }
  }

  // Aggregate Audit logs
  const auditLogs = [...mockStore.auditLogs];
  if (dataStore && Array.isArray(dataStore.auditLogs)) {
    for (const a of dataStore.auditLogs) {
      if (!auditLogs.some(existing => existing.id === a.id)) {
        auditLogs.push(a);
      }
    }
  }

  // 1. Excel (.xlsx) export (Complete: Users, Transactions, Payments, AI Logs, Audit Trail)
  if (format === 'excel' || format === 'xlsx') {
    const workbook = XLSX.utils.book_new();

    // Sheet 1: Users
    const userRows = users.map((u, i) => ({
      No: i + 1,
      ID: u.id,
      Nama: u.full_name || u.fullName || 'User',
      Email: (u as any).email || '-',
      Nomor_HP: u.phone_number || u.phoneNumber || '-',
      Paket: u.plan?.toUpperCase() || 'STARTER',
      Role: u.role || 'user',
      Status_Registrasi: (u.status || u.approval_status || 'approved').toUpperCase(),
      Status_Telegram: u.telegram_connection_status || 'disconnected',
    }));
    const userSheet = XLSX.utils.json_to_sheet(userRows);
    XLSX.utils.book_append_sheet(workbook, userSheet, 'Daftar Pengguna');

    // Sheet 2: Transactions
    const txRows = transactions.map((t, i) => ({
      No: i + 1,
      ID: t.id,
      User_ID: t.user_id,
      Tanggal: (t.transaction_date || t.transactionDate || '').slice(0, 10),
      Jenis: t.type === 'expense' ? 'Pengeluaran' : t.type === 'income' ? 'Pemasukan' : 'Transfer',
      Nominal: t.amount,
      Catatan: t.notes || '-',
      Sumber: t.source || 'web',
    }));
    const txSheet = XLSX.utils.json_to_sheet(txRows);
    XLSX.utils.book_append_sheet(workbook, txSheet, 'Daftar Transaksi');

    // Sheet 3: Payments
    const payRows = payments.map((p, i) => ({
      No: i + 1,
      Order_ID: p.order_id || (p as any).orderId,
      User: p.user?.full_name || (p as any).userName || 'User',
      Paket: p.plan?.toUpperCase() || 'PRO',
      Nominal: p.amount,
      Metode: (p.payment_type || (p as any).paymentMethod || 'midtrans').toUpperCase(),
      Status: p.status,
      Tanggal: (p.created_at || (p as any).createdAt || '').slice(0, 10),
    }));
    const paySheet = XLSX.utils.json_to_sheet(payRows);
    XLSX.utils.book_append_sheet(workbook, paySheet, 'Pembayaran & Midtrans');

    // Sheet 4: AI Logs
    const aiLogRows = aiLogs.map((l, i) => ({
      No: i + 1,
      ID: l.id,
      Provider: l.provider || l.providerName || 'gemini',
      Fitur: l.feature || l.endpointType || 'text_parser',
      Prompt: l.prompt || l.prompt_text || 'Chat prompt',
      Prompt_Tokens: l.prompt_tokens ?? l.promptTokens ?? 0,
      Completion_Tokens: l.completion_tokens ?? l.completionTokens ?? 0,
      Latensi_ms: l.latency_ms ?? l.latencyMs ?? 0,
      Status: l.status || 'success',
      Waktu: (l.created_at || l.createdAt || '').slice(0, 19).replace('T', ' '),
    }));
    const aiLogSheet = XLSX.utils.json_to_sheet(aiLogRows);
    XLSX.utils.book_append_sheet(workbook, aiLogSheet, 'Log AI Telemetri');

    // Sheet 5: Audit Trail
    const auditRows = auditLogs.map((a, i) => ({
      No: i + 1,
      ID: a.id,
      Admin_ID: a.admin_id || a.adminId || 'adm_unga_01',
      Aksi: a.action,
      Target_User: a.targetUserName || a.target_user_id || a.targetUserId || '-',
      Detail: typeof a.details === 'object' ? JSON.stringify(a.details) : String(a.details || '-'),
      Waktu: (a.created_at || a.createdAt || '').slice(0, 19).replace('T', ' '),
    }));
    const auditSheet = XLSX.utils.json_to_sheet(auditRows);
    XLSX.utils.book_append_sheet(workbook, auditSheet, 'Audit Trail Admin');

    const buf = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    const fileName = `tatadana_admin_export_${dateStr}.xlsx`;

    return new Response(buf, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${fileName}"`,
      },
    });
  }

  // 2. PDF export
  if (format === 'pdf') {
    const doc = new jsPDF();
    doc.setFillColor(37, 99, 235); // TataDana Electric Blue #2563EB
    doc.rect(0, 0, 210, 24, 'F');
    doc.setFontSize(16);
    doc.setTextColor(255, 255, 255);
    doc.text('TataDana — Rekap Data Superadmin', 14, 16);

    doc.setFontSize(10);
    doc.setTextColor(80, 80, 80);
    doc.text(`Waktu Ekspor: ${new Date().toLocaleString('id-ID')} WIB`, 14, 32);
    doc.text(`Superadmin Lead: Unga Putri (ungaaputrii@gmail.com)`, 14, 38);
    doc.text(`Total Pengguna: ${users.length} | Total Transaksi: ${transactions.length} | AI Logs: ${aiLogs.length} | Audit Logs: ${auditLogs.length}`, 14, 44);

    const userTableData = users.map((u, i) => [
      i + 1,
      u.full_name || u.fullName || 'User',
      (u as any).email || u.phone_number || '-',
      (u.plan || 'starter').toUpperCase(),
      (u.status || u.approval_status || 'approved').toUpperCase(),
      u.telegram_connection_status === 'connected' ? 'Connected' : 'Offline'
    ]);

    (doc as any).autoTable({
      startY: 50,
      head: [['No', 'Nama Pengguna', 'Email / Kontak', 'Paket', 'Status', 'Telegram']],
      body: userTableData,
      theme: 'grid',
      headStyles: { fillColor: [37, 99, 235], textColor: [255, 255, 255], fontStyle: 'bold' },
      styles: { fontSize: 8, cellPadding: 2.5 }
    });

    const finalY = (doc as any).lastAutoTable?.finalY || 120;
    doc.setFontSize(11);
    doc.setTextColor(30, 30, 30);
    doc.text('Daftar Transaksi Terakhir:', 14, finalY + 10);

    const txTableData = transactions.slice(0, 10).map((t, i) => [
      i + 1,
      (t.transaction_date || t.transactionDate || '').slice(0, 10),
      t.type === 'income' ? 'Pemasukan' : 'Pengeluaran',
      t.notes || '-',
      `Rp ${Number(t.amount).toLocaleString('id-ID')}`
    ]);

    (doc as any).autoTable({
      startY: finalY + 14,
      head: [['No', 'Tanggal', 'Jenis', 'Catatan', 'Nominal']],
      body: txTableData,
      theme: 'grid',
      headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold' },
      styles: { fontSize: 8, cellPadding: 2 }
    });

    const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
    const fileName = `tatadana_admin_export_${dateStr}.pdf`;

    return new Response(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${fileName}"`,
      },
    });
  }

  // 3. Complete JSON export (all users, transactions, logs)
  const exportData = {
    generated_at: new Date().toISOString(),
    superadmin: 'Unga Putri (ungaaputrii@gmail.com)',
    users,
    wallets: Array.from(mockStore.wallets.values()),
    categories: Array.from(mockStore.categories.values()),
    budgets: Array.from(mockStore.budgets.values()),
    transactions,
    payments,
    ai_logs: aiLogs,
    audit_logs: auditLogs,
  };

  const jsonString = JSON.stringify(exportData, null, 2);
  const fileName = `tatadana_full_export_${dateStr}.json`;

  return new Response(jsonString, {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="${fileName}"`,
    },
  });
}
