# Dispatch Message

## 2026-10-23T11:55:41Z
Sender: ed4e250d-b512-4ed4-98e4-35b628002e0b
Recipient: orchestrator_3

You are the Project Orchestrator for the TataDana SaaS project.

Your Working Directory: C:\Users\User\.gemini\antigravity\scratch\tatadana\.agents\teamwork\orchestrator_3
Project Workspace Root: C:\Users\User\.gemini\antigravity\scratch\tatadana
Authoritative User Request: C:\Users\User\.gemini\antigravity\scratch\tatadana\.agents\teamwork\ORIGINAL_REQUEST.md (see the follow-up section timestamped 2026-10-23T11:53:36Z)

User Request & Requirements:
Requested team size: 5 orang.

Scope:
TataDana adalah aplikasi SaaS manajemen keuangan pribadi Indonesia terintegrasi dengan Next.js 14 App Router, Telegram Bot (@keuanganunga_bot), dan Supabase / Mock Storage, yang membutuhkan sistem proteksi hak akses admin panel yang ketat, verifikasi OTP WhatsApp dua arah untuk user baru dan superadmin, pencatatan otomatis pendaftaran ke admin panel, serta fitur inspeksi detail profil user dari admin dashboard.

Key Requirements:
- R1. Proteksi Hak Akses Admin Panel (Admin Access Control & Role Guard):
  - Panel admin (/admin dan sub-rute /admin/users, /admin/payments, /admin/ai-providers, /admin/impersonate, dll) HANYA boleh diakses oleh Superadmin resmi (ungaaputrii@gmail.com).
  - Pengguna umum (seperti bungaputri@gmail.com atau user baru) diblokir dan diredirect ke /dashboard atau /auth/login dengan notifikasi hak akses ditolak.
- R2. Pendaftaran Pengguna Wajib Verifikasi WhatsApp OTP:
  - Calon user baru mendaftar di /auth/register wajib verifikasi nomor telepon/WhatsApp sebelum aktif.
  - Kirim OTP ke WhatsApp / endpoint OTP (/api/auth/otp), input 6 digit OTP verifikasi sebelum ke dashboard onboarding.
- R3. Pencatatan Otomatis User yang Mendaftar di Admin Panel:
  - User baru langsung tercatat di database (dataStore.users / mockStore.profiles) secara real-time.
  - /admin/users dan admin dashboard menampilkan daftar user dengan status verifikasi (WhatsApp Verified), nomor telepon, email, tanggal registrasi, paket langganan.
- R4. Fitur Inspeksi Profil Pengguna di Admin Dashboard:
  - Tombol modal / drawer User Profile Inspector di /admin dan /admin/users menampilkan info profil lengkap (nama, avatar, email, nomor WA, status verifikasi WA, tgl bergabung, paket, saldo dompet, riwayat transaksi terakhir).
- R5. Verifikasi WhatsApp 2FA saat Superadmin Login:
  - Login ungaaputrii@gmail.com / 1234 memicu 2FA via WhatsApp OTP (+6281288889999 / +6281298765432). Validasi OTP sebelum sesi superadmin diberikan dan dialihkan ke /admin.
- Tests & Stability:
  - Seluruh unit & integration tests di src/tests/run-all-tests.ts lulus 100%.
  - Server Next.js 14 App Router tetap berjalan lancar pada port 3000 tanpa regresi error.
