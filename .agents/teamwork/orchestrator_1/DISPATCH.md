## 2026-10-17T10:43:25Z
From: 21685e0a-e962-4662-803a-a7b6f391a3bf (parent)
Priority: MESSAGE_PRIORITY_HIGH

You are the Project Orchestrator for TataDana.

Your Working Directory: C:\Users\User\.gemini\antigravity\scratch\tatadana\.agents\teamwork\orchestrator_1
Project Root Directory: C:\Users\User\.gemini\antigravity\scratch\tatadana
Original Request File: C:\Users\User\.gemini\antigravity\scratch\tatadana\.agents\teamwork\ORIGINAL_REQUEST.md

Please read ORIGINAL_REQUEST.md carefully.
User Request Summary:
- Requested team: kerjakan dengan 15 orang
- TataDana adalah aplikasi SaaS manajemen keuangan pribadi premium Indonesia yang terintegrasi penuh end-to-end dengan Telegram Bot (@ungakeuanganbot) dan database Supabase Postgres, memungkinkan pencatatan pemasukan/pengeluaran via chat bahasa natural, foto struk OCR, voice note, dan dashboard analitik interaktif.
- Integrity mode: development

Key Requirements:
R1. Tata AI Bot & Integrasi Telegram Bot End-to-End
- Single Telegram Bot bersama (@ungakeuanganbot) dengan webhook publik /api/telegram/webhook idempoten (anti-duplikasi transaksi).
- Parsing transaksi berbasis LLM terstruktur untuk bahasa natural Indonesia (misal: "beli bakso 15rb", "kopi 25k", "gajian 5jt").
- Fitur Tata AI Bot di antarmuka web dengan opsi pemilihan tanggal transaksi, jenis (pemasukan/pengeluaran), serta pilihan dompet sumber (BCA, GoPay, Dompet Tunai) yang tersinkronisasi dua arah ke database transaksi dan laporan.
- Bot simulator interaktif in-app dengan testing chat real-time, simulasi voice note, dan foto struk OCR.

R2. User Dashboard & Sistem Manajemen Keuangan Lengkap
- Tampilan antarmuka modern bernuansa Electric Blue & Obsidian Slate/Black (Generative UI premium fintech).
- Multi-Wallet (BCA, Mandiri, GoPay, OVO, Dompet Tunai) dengan saldo real-time dan transfer antar-dompet.
- Anggaran (Budget) multi-periode: Harian, Mingguan, dan Bulanan per kategori dengan indikator visual progress bar dan alert Telegram (80% & 100%).
- Laporan & Kalender transaksi: Halaman Laporan native dengan pencarian, filter kategori/wallet/tanggal, dan ekspor on-demand ke PDF dan Excel (.xlsx) beserta riwayat unduhan.
- Kalender keuangan interaktif yang menampilkan cashflow harian dan agenda tagihan.

R3. Panel Admin & Superadmin Controls
- Kredensial login admin: ungaaputrii@gmail.com dan kata sandi 1234.
- Fitur persetujuan admin (Approve / Reject Admin) untuk pendaftaran user baru dan verifikasi pembayaran manual Midtrans.
- Pengaturan multi-provider AI (Gemini, OpenAI, DeepSeek) dengan mode failover paralel atau single, serta monitoring AI call logs.
- Manajemen pengguna, impersonasi akun user tanpa login ulang untuk audit/bantuan, dan ekspor data seluruh pengguna.
- Manajemen profil dengan ganti foto avatar dan sinkronisasi instan ke seluruh antarmuka.

R4. Skema Database & Migrasi Supabase
- Seluruh tabel didefinisikan secara deklaratif di supabase/migrations (users, wallets, categories, transactions, budgets, recurring_bills, ai_logs, export_records, midtrans_payments, audit_logs) dengan proteksi Row Level Security (RLS).

Acceptance Criteria:
- Parsing transaksi format nominal Indonesia ("15rb", "500k", "1.5jt") tervalidasi akurat dan lolos seluruh unit test.
- Webhook Telegram idempotent mengabaikan retry update_id yang sama dan merespons dalam < 1.5 detik.
- Bot simulator dan bot Telegram riil terhubung ke database lokal/Supabase secara konsisten.
- Transaksi yang dicatat via Tata AI Bot (dengan pilihan tanggal & dompet BCA/GoPay/Tunai) langsung muncul di Transaksi dan Laporan.
- Halaman login superadmin menerima email ungaaputrii@gmail.com dan password 1234.
- Aksi Approve Admin dapat mengubah status user dan transaksi pembayaran secara instan.
- Ekspor file PDF dan Excel (.xlsx) menghasilkan file valid dengan format data rapi dan timestamp zona waktu WIB.
- Tampilan konsisten dalam palet tema Blue & Obsidian Black yang responsif pada resolusi 375px hingga 1280px.

As the Orchestrator, initialize plan.md, progress.md, and BRIEFING.md in your working directory. Decompose this project into subtasks and dispatch specialists/workers (targeting 15 roles/workers as requested by the user), coordinate them, ensure unit tests and verification pass, and notify me with your completion report when finished.
