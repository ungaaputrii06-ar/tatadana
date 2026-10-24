import * as XLSX from 'xlsx';
import { Transaction, UserProfile } from '../types';
import { formatWIBDate, formatWIBDateTime } from '../utils/date';

interface ExcelReportOptions {
  user: UserProfile;
  transactions: Transaction[];
  startDate?: string;
  endDate?: string;
  totalIncome: number;
  totalExpense: number;
  netCashflow: number;
}

export function generateFinancialExcel(
  optionsOrTxs: ExcelReportOptions | Transaction[],
  formatOrUser: 'xlsx' | 'csv' | UserProfile = 'xlsx',
  filtersArg?: { startDate?: string; endDate?: string; totalIncome?: number; totalExpense?: number; netCashflow?: number }
): Uint8Array {
  let user: UserProfile;
  let transactions: Transaction[];
  let startDate: string | undefined;
  let endDate: string | undefined;
  let totalIncome: number;
  let totalExpense: number;
  let netCashflow: number;
  let format: 'xlsx' | 'csv' = 'xlsx';

  if (Array.isArray(optionsOrTxs)) {
    transactions = optionsOrTxs;
    user = (typeof formatOrUser === 'object' ? formatOrUser : undefined) || { id: 'usr_default', full_name: 'Pengguna', fullName: 'Pengguna' };
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
    format = typeof formatOrUser === 'string' ? formatOrUser : 'xlsx';
  }

  const workbook = XLSX.utils.book_new();

  // 1. Sheet 1: Ringkasan & Transaksi
  const userName = user?.full_name || user?.fullName || 'Pengguna';
  const userPhone = user?.phone_number || user?.phoneNumber || user?.email || '-';

  const mainSheetData: (string | number)[][] = [
    ['TATADANA - LAPORAN KEUANGAN PRIBADI'],
    [`User: ${userName} (${userPhone})`],
    [`Tanggal Unduh: ${formatWIBDateTime()}`],
    [
      startDate && endDate
        ? `Periode: ${formatWIBDate(startDate)} s/d ${formatWIBDate(endDate)}`
        : 'Periode: Semua Transaksi',
    ],
    [], // empty row
    ['RINGKASAN ARUS KAS', 'NOMINAL (IDR)'],
    ['Total Pemasukan', totalIncome],
    ['Total Pengeluaran', totalExpense],
    ['Arus Kas Bersih (Net)', netCashflow],
    ['Total Jumlah Transaksi', transactions.length],
    [], // empty row
    ['DAFTAR TRANSAKSI'],
    ['No', 'Tanggal', 'Jenis', 'Kategori', 'Dompet', 'Nominal', 'Catatan', 'Sumber Data'],
  ];

  transactions.forEach((tx, idx) => {
    const typeLabel = tx.type === 'income' ? 'Pemasukan' : tx.type === 'expense' ? 'Pengeluaran' : 'Transfer';
    const categoryName = tx.category ? `${tx.category.emoji} ${tx.category.name}` : '-';
    const walletName = tx.wallet?.name || '-';
    const sourceLabel =
      tx.source === 'telegram_text'
        ? 'Telegram Chat'
        : tx.source === 'telegram_receipt'
        ? 'Foto Struk (OCR)'
        : tx.source === 'telegram_voice'
        ? 'Voice Note'
        : 'Web Dashboard';

    mainSheetData.push([
      idx + 1,
      formatWIBDate(tx.transaction_date || tx.transactionDate || ''),
      typeLabel,
      categoryName,
      walletName,
      tx.amount,
      tx.notes || '-',
      sourceLabel,
    ]);
  });

  const wsMain = XLSX.utils.aoa_to_sheet(mainSheetData);

  // Set column widths for readability
  wsMain['!cols'] = [
    { wch: 6 },  // No
    { wch: 18 }, // Tanggal
    { wch: 14 }, // Jenis
    { wch: 24 }, // Kategori
    { wch: 18 }, // Dompet
    { wch: 16 }, // Nominal
    { wch: 35 }, // Catatan
    { wch: 18 }, // Sumber
  ];

  XLSX.utils.book_append_sheet(workbook, wsMain, 'Laporan Keuangan');

  // 2. Sheet 2: Rincian Item Struk (jika ada transaksi dari struk foto)
  const receiptRows: (string | number)[][] = [
    ['RINCIAN ITEM DARI STRUK BELANJA (OCR VISION)'],
    ['ID Transaksi', 'Tanggal', 'Nama Item', 'Kategori Item', 'Harga (IDR)'],
  ];

  let hasReceiptItems = false;
  transactions.forEach((tx) => {
    const items = tx.receipt_items || tx.items;
    if (items && items.length > 0) {
      hasReceiptItems = true;
      items.forEach((item) => {
        receiptRows.push([
          tx.id,
          formatWIBDate(tx.transaction_date || tx.transactionDate || ''),
          item.item_name || item.itemName || 'Item',
          item.category_name || item.categoryName || 'Umum',
          item.price || item.totalPrice || item.pricePerUnit || 0,
        ]);
      });
    }
  });

  if (hasReceiptItems) {
    const wsReceipt = XLSX.utils.aoa_to_sheet(receiptRows);
    wsReceipt['!cols'] = [
      { wch: 12 },
      { wch: 18 },
      { wch: 30 },
      { wch: 20 },
      { wch: 16 },
    ];
    XLSX.utils.book_append_sheet(workbook, wsReceipt, 'Item Struk Belanja');
  }

  if (format === 'csv') {
    const csvContent = XLSX.utils.sheet_to_csv(wsMain);
    return new TextEncoder().encode(csvContent);
  }

  // Generate buffer
  const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  return new Uint8Array(excelBuffer);
}

/**
 * Interface contract matching PROJECT.md § Export Service Contract:
 * generateTransactionExcel(transactions, filters, summary): Promise<Uint8Array> -> Valid ZIP PK header.
 */
export async function generateTransactionExcel(
  transactions: Transaction[],
  filters?: { startDate?: string; endDate?: string; categoryId?: string; walletId?: string } | UserProfile,
  summary?: { totalIncome?: number; totalExpense?: number; netCashflow?: number; user?: UserProfile; format?: 'xlsx' | 'csv' } | { periodLabel?: string; startDate?: string; endDate?: string }
): Promise<Uint8Array> {
  let user: UserProfile;
  let actualFilters: { startDate?: string; endDate?: string; categoryId?: string; walletId?: string } | undefined;
  let actualSummary: { totalIncome?: number; totalExpense?: number; netCashflow?: number; user?: UserProfile; format?: 'xlsx' | 'csv' } | undefined;

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

  return generateFinancialExcel(
    {
      user,
      transactions,
      startDate: actualFilters?.startDate,
      endDate: actualFilters?.endDate,
      totalIncome,
      totalExpense,
      netCashflow,
    },
    actualSummary?.format || 'xlsx'
  );
}

