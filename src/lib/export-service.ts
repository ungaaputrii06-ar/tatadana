import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { Transaction, ExportRecord } from './types';
import { dataStore } from './storage-mock';

// Generate and Download PDF Report
export async function generatePdfReport(transactions: Transaction[], periodStart: string, periodEnd: string): Promise<ExportRecord> {
  const doc = new jsPDF();

  // Primary Colors & Header
  doc.setFillColor(37, 99, 235); // TataDana Electric Blue #2563EB
  doc.rect(0, 0, 210, 28, 'F');

  doc.setFontSize(20);
  doc.setTextColor(255, 255, 255);
  doc.text('TataDana — Laporan Keuangan', 14, 18);

  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  doc.text('https://tatadana.app', 160, 18);

  // Subheader Info
  doc.setTextColor(60, 60, 60);
  doc.setFontSize(11);
  doc.text(`Periode: ${periodStart} s/d ${periodEnd}`, 14, 38);
  doc.text(`Waktu Cetak: ${new Date().toLocaleDateString('id-ID')} WIB`, 14, 45);

  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
  const totalIncome = transactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
  const netCashflow = totalIncome - totalExpense;

  doc.setFontSize(11);
  doc.text(`Total Pemasukan : Rp ${totalIncome.toLocaleString('id-ID')}`, 120, 38);
  doc.text(`Total Pengeluaran : Rp ${totalExpense.toLocaleString('id-ID')}`, 120, 45);
  doc.text(`Net Cashflow : Rp ${netCashflow.toLocaleString('id-ID')}`, 120, 52);

  // Table Data
  const tableData = transactions.map((t, idx) => [
    idx + 1,
    new Date(t.transactionDate || t.transaction_date || '').toLocaleDateString('id-ID'),
    t.type === 'expense' ? 'Pengeluaran' : t.type === 'income' ? 'Pemasukan' : 'Transfer',
    t.categoryName || '-',
    t.walletName || '-',
    t.notes || '-',
    `Rp ${t.amount.toLocaleString('id-ID')}`
  ]);

  (doc as any).autoTable({
    startY: 58,
    head: [['No', 'Tanggal', 'Jenis', 'Kategori', 'Dompet', 'Catatan', 'Nominal']],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: [37, 99, 235],
      textColor: [255, 255, 255],
      fontStyle: 'bold'
    },
    alternateRowStyles: {
      fillColor: [250, 250, 250]
    },
    styles: {
      fontSize: 9,
      cellPadding: 3
    }
  });

  const fileName = `TataDana_Laporan_${periodStart}_sd_${periodEnd}.pdf`;
  const pdfBlob = doc.output('blob');
  const blobUrl = URL.createObjectURL(pdfBlob);

  const record: ExportRecord = {
    id: 'exp_' + Date.now(),
    userId: dataStore.user.id,
    fileName,
    fileFormat: 'pdf',
    periodStart,
    periodEnd,
    totalRecords: transactions.length,
    fileSizeBytes: pdfBlob.size || 102400,
    downloadUrl: blobUrl,
    createdAt: new Date().toISOString()
  };

  dataStore.exports.unshift(record);

  // Trigger browser download if in window
  if (typeof window !== 'undefined') {
    doc.save(fileName);
  }

  return record;
}

// Generate and Download Excel (.xlsx) Report
export async function generateExcelReport(transactions: Transaction[], periodStart: string, periodEnd: string): Promise<ExportRecord> {
  const rows = transactions.map((t, idx) => ({
    No: idx + 1,
    Tanggal: new Date(t.transactionDate || t.transaction_date || '').toLocaleDateString('id-ID'),
    Jenis: t.type === 'expense' ? 'Pengeluaran' : t.type === 'income' ? 'Pemasukan' : 'Transfer',
    Kategori: t.categoryName || '-',
    Dompet: t.walletName || '-',
    Nominal: t.amount,
    Catatan: t.notes || '-',
    Sumber: t.source
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Transaksi');

  const fileName = `TataDana_Laporan_${periodStart}_sd_${periodEnd}.xlsx`;

  if (typeof window !== 'undefined') {
    XLSX.writeFile(workbook, fileName);
  }

  const record: ExportRecord = {
    id: 'exp_' + Date.now(),
    userId: dataStore.user.id,
    fileName,
    fileFormat: 'xlsx',
    periodStart,
    periodEnd,
    totalRecords: transactions.length,
    fileSizeBytes: 65400,
    downloadUrl: '#',
    createdAt: new Date().toISOString()
  };

  dataStore.exports.unshift(record);
  return record;
}
