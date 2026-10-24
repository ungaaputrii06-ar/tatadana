# Original User Request

## Initial Request — 2026-10-17T10:41:38Z

Requested team: kerjakan dengan 15 orang

TataDana adalah aplikasi SaaS manajemen keuangan pribadi premium Indonesia yang terintegrasi penuh end-to-end dengan Telegram Bot (@ungakeuanganbot) dan database Supabase Postgres, memungkinkan pencatatan pemasukan/pengeluaran via chat bahasa natural, foto struk OCR, voice note, dan dashboard analitik interaktif.

Working directory: C:\Users\User\.gemini\antigravity\scratch\tatadana
Integrity mode: development

## Requirements

### R1. Tata AI Bot & Integrasi Telegram Bot End-to-End
- Single Telegram Bot bersama (@ungakeuanganbot) dengan webhook publik `/api/telegram/webhook` idempoten (anti-duplikasi transaksi).
- Parsing transaksi berbasis LLM terstruktur untuk bahasa natural Indonesia (misal: "beli bakso 15rb", "kopi 25k", "gajian 5jt").
- Fitur Tata AI Bot di antarmuka web dengan opsi pemilihan tanggal transaksi, jenis (pemasukan/pengeluaran), serta pilihan dompet sumber (BCA, GoPay, Dompet Tunai) yang tersinkronisasi dua arah ke database transaksi dan laporan.
- Bot simulator interaktif in-app dengan testing chat real-time, simulasi voice note, dan foto struk OCR.

### R2. User Dashboard & Sistem Manajemen Keuangan Lengkap
- Tampilan antarmuka modern bernuansa Electric Blue & Obsidian Slate/Black (Generative UI premium fintech).
- Multi-Wallet (BCA, Mandiri, GoPay, OVO, Dompet Tunai) dengan saldo real-time dan transfer antar-dompet.
- Anggaran (Budget) multi-periode: Harian, Mingguan, dan Bulanan per kategori dengan indikator visual progress bar dan alert Telegram (80% & 100%).
- Laporan & Kalender transaksi: Halaman Laporan native dengan pencarian, filter kategori/wallet/tanggal, dan ekspor on-demand ke PDF dan Excel (.xlsx) beserta riwayat unduhan.
- Kalender keuangan interaktif yang menampilkan cashflow harian dan agenda tagihan.

### R3. Panel Admin & Superadmin Controls
- Kredensial login admin: `ungaaputrii@gmail.com` dan kata sandi `1234`.
- Fitur persetujuan admin (Approve / Reject Admin) untuk pendaftaran user baru dan verifikasi pembayaran manual Midtrans.
- Pengaturan multi-provider AI (Gemini, OpenAI, DeepSeek) dengan mode failover paralel atau single, serta monitoring AI call logs.
- Manajemen pengguna, impersonasi akun user tanpa login ulang untuk audit/bantuan, dan ekspor data seluruh pengguna.
- Manajemen profil dengan ganti foto avatar dan sinkronisasi instan ke seluruh antarmuka.

### R4. Skema Database & Migrasi Supabase
- Seluruh tabel didefinisikan secara deklaratif di `supabase/migrations` (users, wallets, categories, transactions, budgets, recurring_bills, ai_logs, export_records, midtrans_payments, audit_logs) dengan proteksi Row Level Security (RLS).

## Acceptance Criteria

### Integrasi & Otomasi Bot
- [ ] Parsing transaksi format nominal Indonesia ("15rb", "500k", "1.5jt") tervalidasi akurat dan lolos seluruh unit test.
- [ ] Webhook Telegram idempotent mengabaikan retry update_id yang sama dan merespons dalam < 1.5 detik.
- [ ] Bot simulator dan bot Telegram riil terhubung ke database lokal/Supabase secara konsisten.
- [ ] Transaksi yang dicatat via Tata AI Bot (dengan pilihan tanggal & dompet BCA/GoPay/Tunai) langsung muncul di Transaksi dan Laporan.

### Dashboard & Performa
- [ ] Halaman login superadmin menerima email `ungaaputrii@gmail.com` dan password `1234`.
- [ ] Aksi Approve Admin dapat mengubah status user dan transaksi pembayaran secara instan.
- [ ] Ekspor file PDF dan Excel (.xlsx) menghasilkan file valid dengan format data rapi dan timestamp zona waktu WIB.
- [ ] Tampilan konsisten dalam palet tema Blue & Obsidian Black yang responsif pada resolusi 375px hingga 1280px.


## Follow-up — 2026-10-23T11:53:36Z

Requested team: kerjakan dengan 5 orang

TataDana adalah aplikasi SaaS manajemen keuangan pribadi Indonesia terintegrasi dengan Next.js 14 App Router, Telegram Bot (@keuanganunga_bot), dan Supabase / Mock Storage, yang membutuhkan sistem proteksi hak akses admin panel yang ketat, verifikasi OTP WhatsApp dua arah untuk user baru dan superadmin, pencatatan otomatis pendaftaran ke admin panel, serta fitur inspeksi detail profil user dari admin dashboard.

Working directory: C:\Users\User\.gemini\antigravity\scratch\tatadana
Integrity mode: development

## Requirements

### R1. Proteksi Hak Akses Admin Panel (Admin Access Control & Role Guard)
- Panel admin (`/admin` dan seluruh sub-rute seperti `/admin/users`, `/admin/payments`, `/admin/ai-providers`, `/admin/impersonate`, dll) HANYA boleh diakses oleh Superadmin resmi (`ungaaputrii@gmail.com`).
- Pengguna umum (seperti `bungaputri@gmail.com` atau user yang baru mendaftar) secara tegas TIDAK BISA mengakses panel admin.
- Jika pengguna non-admin mencoba mengakses `/admin` atau rute admin lainnya, sistem wajib memblokir akses dan mengarahkan kembali (redirect) ke `/dashboard` atau `/auth/login` disertai notifikasi peringatan hak akses ditolak (*Unauthorized Access*).

### R2. Pendaftaran Pengguna Wajib Verifikasi WhatsApp OTP
- Setiap calon pengguna baru yang mendaftar melalui form registrasi (`/auth/register`) WAJIB memverifikasi nomor telepon/WhatsApp miliknya sebelum akun dapat diaktifkan dan digunakan.
- Sistem mengirimkan kode OTP ke WhatsApp / endpoint OTP (`/api/auth/otp`), dan pengguna harus memasukkan 6 digit kode OTP verifikasi tersebut dengan benar sebelum diarahkan ke dashboard onboarding.

### R3. Pencatatan Otomatis User yang Mendaftar di Admin Panel
- Setiap pengguna yang mendaftar dan memverifikasi akunnya harus langsung tercatat di database sistem (`dataStore.users` / `mockStore.profiles`) dan terintegrasi secara *real-time*.
- Admin dashboard dan halaman manajemen pengguna (`/admin/users`) wajib menampilkan seluruh daftar pengguna yang terdaftar beserta status verifikasinya (*WhatsApp Verified*), nomor telepon, email, tanggal registrasi, dan paket langganan.

### R4. Fitur Inspeksi Profil Pengguna di Admin Dashboard
- Pada panel admin (`/admin` dan `/admin/users`), admin dapat mengeklik salah satu pengguna untuk melihat profil lengkap (*User Profile Inspector*).
- Modal / drawer inspeksi profil menampilkan: Nama Lengkap, Foto Avatar, Email, Nomor WhatsApp, Status Verifikasi WhatsApp, Tanggal Bergabung, Paket Akun (Starter / Pro), Ringkasan Dompet / Saldo, dan Riwayat Transaksi Terakhir pengguna tersebut.

### R5. Verifikasi WhatsApp 2FA saat Superadmin Login
- Saat admin masuk melalui form login dengan kredensial email `ungaaputrii@gmail.com` dan password `1234`, sistem TIDAK LANGSUNG memberikan akses ke admin dashboard.
- Sistem wajib memicu langkah verifikasi tambahan (*Two-Factor Authentication via WhatsApp OTP*): kode OTP dikirimkan ke nomor WhatsApp admin (+6281288889999 / +6281298765432), dan admin wajib memvalidasi kode OTP tersebut sebelum sesi superadmin diberikan dan dialihkan ke `/admin`.

## Acceptance Criteria

### Hak Akses & Keamanan
- [ ] Pengguna biasa (`bungaputri@gmail.com` atau akun selain `ungaaputrii@gmail.com`) yang mengakses `/admin` atau sub-halaman admin langsung diblokir dan diredirect dengan pesan tidak memiliki wewenang.
- [ ] Upaya bypass URL langsung ke `/admin/*` tanpa sesi superadmin yang tervalidasi ditolak 100%.

### Verifikasi WhatsApp Pengguna Baru
- [ ] Form pendaftaran `/auth/register` mewajibkan input nomor WhatsApp dan mengirimkan OTP.
- [ ] Akun pengguna baru tidak dapat login atau mengakses dashboard sebelum kode OTP WhatsApp berhasil diverifikasi.

### Sinkronisasi & Inspeksi Admin Panel
- [ ] Pengguna yang mendaftar langsung tercatat dan muncul di tabel `/admin/users` dan rekap statistik total user di `/admin`.
- [ ] Tersedia tombol "Lihat Profil" / "Detail User" pada daftar pengguna di admin dashboard yang menampilkan modal/drawer informasi profil lengkap pengguna.

### Verifikasi WhatsApp Login Superadmin
- [ ] Login menggunakan `ungaaputrii@gmail.com` dan password `1234` memunculkan langkah verifikasi kode OTP WhatsApp.
- [ ] Hanya setelah OTP diverifikasi dengan benar, admin diarahkan ke `/admin` dengan status sesi `superadmin` aktif.

### Stabilitas & Pengujian
- [ ] Seluruh unit & integration tests di `src/tests/run-all-tests.ts` lulus 100% tanpa kegagalan.
- [ ] Server Next.js 14 App Router tetap berjalan lancar pada port 3000 tanpa regresi error.


## Follow-up — 2026-10-23T13:28:18Z

Requested team: kerjakan denga 5 tim

TataDana membutuhkan halaman antarmuka web login modern dan responsif yang dipasang pada sistem Next.js 14 App Router (rute `/auth/login` dan `/login`), yang menampilkan form login di tengah kartu putih rounded dengan latar belakang gelap, capsule switcher role (User vs Admin), input username & password dengan toggle mata, serta kotak bantuan WhatsApp Admin Bunga Putri (08987472983) di bagian bawah kartu.

Working directory: C:\Users\User\.gemini\antigravity\scratch\tatadana
Integrity mode: development

## Requirements

### R1. Tampilan & Tata Letak Layar Penuh (Dark Navy + White Rounded Card)
- Latar belakang layar penuh bernuansa gelap (dark mode / navy obsidian gelap, misal `#090D16` atau `#0B1120`).
- Form login berada tepat di tengah layar (*centered vertically & horizontally*), berupa kartu berwarna putih bersih dengan sudut sangat membulat (*high rounded corners*, `rounded-3xl` / `rounded-2xl`) dan bayangan halus (*soft elevation drop shadow*).
- Desain bersih, modern, proporsional, dan sepenuhnya responsif pada resolusi mobile (375px) hingga desktop (1280px+).

### R2. Pilihan Role (Capsule Switcher: Login User vs Login Admin)
- Di bagian atas kartu terdapat dua tab switcher berbentuk kapsul (*pill/capsule switcher*):
  1. Tab "Login User" dengan ikon profil/user (`User`).
  2. Tab "Login Admin" dengan ikon tameng/keamanan (`ShieldCheck` / `Shield`).
- Tab interaktif dan dapat diklik untuk berganti mode:
  - Jika memilih "Login User": Judul form menjadi "Masuk sebagai User", subtitle menyesuaikan, dan teks tombol aksi utama berubah menjadi "Masuk sebagai User".
  - Jika memilih "Login Admin": Judul form menjadi "Masuk sebagai Admin", subtitle menyesuaikan akses administrator, dan teks tombol aksi utama berubah menjadi "Masuk sebagai Admin".
- Tab aktif memiliki latar belakang putih berkontras tinggi dengan teks biru/aksen, sedangkan tab non-aktif memiliki warna abu-abu lembut.

### R3. Form Input dengan Ikon & Password Visibility Toggle
- Input 1: "Username / Nama Pengguna *" dengan label jelas, asterisk merah tanda wajib, dan ikon user di sisi kiri dalam input.
- Input 2: "Password / Kata Sandi *" dengan label jelas, ikon gembok di sisi kiri, serta tombol ikon mata di sisi kanan untuk melihat (*show*) / menyembunyikan (*hide*) kata sandi secara interaktif (`type="password"` ↔ `type="text"`).
- Tombol Aksi Utama: Tombol selebar penuh (*full width*), berwarna biru cerah modern (`bg-blue-600` / `hover:bg-blue-500`), bertuliskan "Masuk sebagai User" (atau "Masuk sebagai Admin" sesuai role yang aktif) dengan ikon panah (`ArrowRight`) di ujung kanan.
- Integrasi autentikasi: Login sebagai user (`bungaputri@gmail.com`) mengarahkan ke dashboard keuangan (`/dashboard`), sedangkan login sebagai superadmin (`ungaaputrii@gmail.com` / `1234`) terhubung ke alur 2FA WhatsApp sebelum masuk ke panel admin (`/admin`).

### R4. Kotak Bantuan WhatsApp Admin Bunga Putri
- Di bagian paling bawah kartu login (terpisah dengan border halus), terdapat kotak bantuan dua sisi:
  - Sisi kiri: Ikon resmi WhatsApp dan teks informatif: "Ada Pertanyaan? Tanya Admin Bunga Putri".
  - Sisi kanan: Tombol berwarna hijau WhatsApp (`bg-emerald-600` / `bg-green-600`) bertuliskan "Chat WA (08987472983)".
- Mengklik tombol WhatsApp langsung membuka tautan resmi `https://wa.me/628987472983` dalam tab baru (`target="_blank"`) lengkap dengan draf teks otomatis pertanyaan login, contoh: `Halo Admin Bunga Putri, saya butuh bantuan terkait login TataDana.`

## Acceptance Criteria

### Visual & Layout
- [ ] Latar belakang layar penuh berwarna gelap (navy / obsidian black).
- [ ] Form login berwujud kartu putih di tengah layar dengan sudut sangat membulat dan bayangan halus.

### Role Capsule Switcher
- [ ] Terdapat dua tab kapsul: "Login User" (ikon user) dan "Login Admin" (ikon tameng).
- [ ] Mengklik tab User mengubah judul menjadi "Masuk sebagai User" dan tombol menjadi "Masuk sebagai User".
- [ ] Mengklik tab Admin mengubah judul menjadi "Masuk sebagai Admin" dan tombol menjadi "Masuk sebagai Admin".

### Input & Interaktivitas
- [ ] Input username memiliki ikon user di sisi kiri.
- [ ] Input password memiliki ikon gembok di sisi kiri dan ikon mata di sisi kanan yang berfungsi aktif untuk *show/hide* sandi.
- [ ] Tombol aksi berwarna biru cerah, lebar penuh, dengan panah di ujung kanan.

### Bantuan WhatsApp Admin
- [ ] Terdapat teks "Ada Pertanyaan? Tanya Admin Bunga Putri" dengan ikon WhatsApp.
- [ ] Terdapat tombol hijau "Chat WA (08987472983)" yang membuka `https://wa.me/628987472983` dengan draf pesan otomatis ke Admin Bunga Putri.

### Fungsionalitas & Build
- [ ] Halaman login di `/auth/login` dan `/login` terbarui dengan spesifikasi baru ini tanpa error sintaks atau layout.
- [ ] Seluruh unit test lulus dan server localhost:3000 merespons dengan status 200 OK.
