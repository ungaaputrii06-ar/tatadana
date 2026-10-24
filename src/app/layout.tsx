import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'TataDana — Catat Keuangan Semudah Chat Langsung dari Telegram',
  description: 'TataDana adalah aplikasi manajemen keuangan pribadi yang terintegrasi dengan Telegram Bot. Catat pemasukan, pengeluaran, struk, dan budget secara instan dengan AI.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body className="min-h-screen bg-[#090D16] text-[#F8FAFC] antialiased selection:bg-blue-600 selection:text-white transition-colors duration-200">
        {children}
      </body>
    </html>
  );
}
