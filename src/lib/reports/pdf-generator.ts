import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { Transaction, UserProfile } from '../types';
import { formatRupiah } from '../utils/currency';
import { formatWIBDate, formatWIBDateTime } from '../utils/date';

interface PDFReportOptions {
  user: UserProfile;
  transactions: Transaction[];
  startDate?: string;
  endDate?: string;
  totalIncome: number;
  totalExpense: number;
  netCashflow: number;
}

export function generateFinancialPDF(
  optionsOrTxs: PDFReportOptions | Transaction[],
  userArg?: UserProfile,
  filtersArg?: { startDate?: string; endDate?: string; totalIncome?: number; totalExpense?: number; netCashflow?: number }
): Uint8Array {
  let user: UserProfile;
  let transactions: Transaction[];
  let startDate: string | undefined;
  let endDate: string | undefined;
  let totalIncome: number;
  let totalExpense: number;
  let netCashflow: number;

  if (Array.isArray(optionsOrTxs)) {
    transactions = optionsOrTxs;
    user = userArg || { id: 'usr_default', full_name: 'Pengguna', fullName: 'Pengguna' };
    startDate = filtersArg?.startDate;
    endDate = filtersArg?.endDate;
    totalIncome = filtersArg?.totalIncome ?? transactions.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount || 0), 0);
    totalExpense = filtersArg?.totalExpense ?? transactions.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount || 0), 0);
    netCashflow = filtersArg?.netCashflow ?? (totalIncome - totalExpense);
  } else {
    user = optionsOrTxs.user;
    transactions = optionsOrTxs.transactions;
    startDate = optionsOrTxs.startDate;
    endDate = optionsOrTxs.endDate;
    totalIncome = optionsOrTxs.totalIncome;
    totalExpense = optionsOrTxs.totalExpense;
    netCashflow = optionsOrTxs.netCashflow;
  }

  // Initialize A4 PDF
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();

  // 1. Header Banner (Electric Blue fintech aesthetic)
  doc.setFillColor(37, 99, 235); // brand Electric Blue #2563EB
  doc.rect(0, 0, pageWidth, 28, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('TataDana', 14, 15);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Laporan Keuangan & Arus Kas Pribadi', 14, 22);

  // User & Date meta
  const userName = user?.full_name || user?.fullName || 'Pengguna';
  const userPhone = user?.phone_number || user?.phoneNumber || user?.email || '-';

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.text(`User: ${userName} (${userPhone})`, pageWidth - 14, 15, { align: 'right' });
  doc.text(`Generated: ${formatWIBDateTime()}`, pageWidth - 14, 22, { align: 'right' });

  // 2. Report Period Subheader
  doc.setTextColor(71, 85, 105);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  const periodText = startDate && endDate
    ? `Periode: ${formatWIBDate(startDate)} s/d ${formatWIBDate(endDate)}`
    : `Periode: Semua Riwayat Transaksi`;
  doc.text(periodText, 14, 38);

  // 3. Summary Cards (Income, Expense, Net)
  const cardY = 43;
  const cardWidth = (pageWidth - 28 - 8) / 3;
  const cardHeight = 22;

  // Card 1: Pemasukan
  doc.setFillColor(240, 253, 244); // green-50
  doc.setDrawColor(34, 197, 94); // green-500
  doc.roundedRect(14, cardY, cardWidth, cardHeight, 2, 2, 'FD');
  doc.setTextColor(22, 101, 52);
  doc.setFontSize(8);
  doc.text('TOTAL PEMASUKAN', 18, cardY + 7);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(formatRupiah(totalIncome), 18, cardY + 16);

  // Card 2: Pengeluaran
  const card2X = 14 + cardWidth + 4;
  doc.setFillColor(254, 242, 242); // red-50
  doc.setDrawColor(239, 68, 68); // red-500
  doc.roundedRect(card2X, cardY, cardWidth, cardHeight, 2, 2, 'FD');
  doc.setTextColor(153, 27, 27);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('TOTAL PENGELUARAN', card2X + 4, cardY + 7);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(formatRupiah(totalExpense), card2X + 4, cardY + 16);

  // Card 3: Arus Kas Bersih
  const card3X = card2X + cardWidth + 4;
  doc.setFillColor(239, 246, 255); // blue-50
  doc.setDrawColor(37, 99, 235); // blue-600 #2563EB
  doc.roundedRect(card3X, cardY, cardWidth, cardHeight, 2, 2, 'FD');
  doc.setTextColor(30, 64, 175);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('ARUS KAS BERSIH', card3X + 4, cardY + 7);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(formatRupiah(netCashflow), card3X + 4, cardY + 16);

  // 4. Transactions Table
  const tableRows = transactions.map((tx, idx) => {
    const typeLabel = tx.type === 'income' ? 'Pemasukan' : tx.type === 'expense' ? 'Pengeluaran' : 'Transfer';
    const amountStr = `${tx.type === 'income' ? '+' : '-'}${formatRupiah(tx.amount)}`;
    const categoryStr = tx.category ? `${tx.category.emoji} ${tx.category.name}` : '-';
    const walletStr = tx.wallet?.name || '-';
    let notes = tx.notes || '-';
    const receiptItems = tx.receipt_items || tx.items;
    if (receiptItems && receiptItems.length > 0) {
      notes += ` [${receiptItems.length} item struk: ${receiptItems.map((i) => i.item_name || i.itemName || 'item').join(', ')}]`;
    }

    return [
      String(idx + 1),
      formatWIBDate(tx.transaction_date || tx.transactionDate || ''),
      typeLabel,
      categoryStr,
      walletStr,
      notes,
      amountStr,
    ];
  });

  // Call autoTable plugin
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (doc as any).autoTable({
    startY: 72,
    head: [['No', 'Tanggal', 'Jenis', 'Kategori', 'Dompet', 'Catatan', 'Nominal']],
    body: tableRows,
    theme: 'grid',
    headStyles: {
      fillColor: [37, 99, 235],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9,
    },
    styles: {
      fontSize: 8,
      cellPadding: 3,
      textColor: [51, 65, 85],
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 26 },
      2: { cellWidth: 22 },
      3: { cellWidth: 32 },
      4: { cellWidth: 24 },
      5: { cellWidth: 'auto' },
      6: { cellWidth: 28, halign: 'right', fontStyle: 'bold' },
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
  });

  // 5. Footer Page Numbers
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `TataDana — Halaman ${i} dari ${pageCount} | Catat keuangan semudah chat via Telegram`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 8,
      { align: 'center' }
    );
  }

  const pdfOutput = doc.output('arraybuffer');
  return new Uint8Array(pdfOutput);
}

/**
 * Interface contract matching PROJECT.md § Export Service Contract:
 * generateTransactionPDF(transactions, filters, summary): Promise<Uint8Array> -> Valid %PDF header.
 */
export async function generateTransactionPDF(
  transactions: Transaction[],
  filters?: { startDate?: string; endDate?: string; categoryId?: string; walletId?: string } | UserProfile,
  summary?: { totalIncome?: number; totalExpense?: number; netCashflow?: number; user?: UserProfile } | { periodLabel?: string; startDate?: string; endDate?: string }
): Promise<Uint8Array> {
  let user: UserProfile;
  let actualFilters: { startDate?: string; endDate?: string; categoryId?: string; walletId?: string } | undefined;
  let actualSummary: { totalIncome?: number; totalExpense?: number; netCashflow?: number; user?: UserProfile } | undefined;

  if (filters && ('id' in filters || 'full_name' in filters || 'fullName' in filters || 'email' in filters)) {
    user = filters as UserProfile;
    actualFilters = summary as any;
    actualSummary = undefined;
  } else {
    actualFilters = filters as any;
    actualSummary = summary as any;
    user = actualSummary?.user || {
      id: 'usr_bunga_01',
      full_name: 'Bunga Putri',
      phone_number: '+6281298765432',
      default_currency: 'IDR',
      role: 'user',
      plan: 'pro',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }

  const totalIncome = actualSummary?.totalIncome ?? transactions.filter((t) => t.type === 'income').reduce((s, t) => s + Number(t.amount || 0), 0);
  const totalExpense = actualSummary?.totalExpense ?? transactions.filter((t) => t.type === 'expense').reduce((s, t) => s + Number(t.amount || 0), 0);
  const netCashflow = actualSummary?.netCashflow ?? (totalIncome - totalExpense);

  return generateFinancialPDF({
    user,
    transactions,
    startDate: actualFilters?.startDate,
    endDate: actualFilters?.endDate,
    totalIncome,
    totalExpense,
    netCashflow,
  });
}

