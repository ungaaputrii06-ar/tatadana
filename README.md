# TataDana — FinTech Management & Telegram Bot SaaS

> **Tagline:** Catat keuangan semudah chat — langsung dari Telegram kamu.
> **App Language:** 100% Bahasa Indonesia.
> **Theme:** Dual-Theme (Dark Obsidian Latar Belakang Hitam Premium + Radiant Orange Accent & Light Mode Orange-Putih).

---

## 🚀 Fitur Unggulan End-to-End

1. **Telegram Bot Multi-Format (Inti Produk):**
   - **Teks Alami:** Parsing berbasis LLM mengenali slang mata uang Indonesia (`beli bakso 15rb`, `gajian 5jt`, `kopi 25k`, `500k`).
   - **Foto Struk (Khusus Pro):** AI Vision OCR mengekstrak nama toko, tanggal, dan multi-item belanjaan ke database.
   - **Voice Note (VN):** Transkripsi otomatis Speech-to-Text dengan batas 60 detik dan format balasan lengkap.
   - **Format Reply Terstruktur:** Disertai visual progress bar ASCII (`[████░░░░] 60%`), sisa budget, dan timestamp WIB (`Asia/Jakarta`).
   - **Commands Bot:** `/saldo`, `/hari ini`, `/minggu ini`, `/bulan ini`, `/budget`, `/sheet`, `/bantuan`.
   - **AI Financial Advisor (Pro):** Peringatan otomatis jika pengeluaran melonjak &gt;50% atau menyentuh &gt;80% gaji.
   - **Reminder Harian:** Pengingat otomatis maksimal 2x sehari sesuai jam pilihan user.

2. **Database & Auth Supabase:**
   - 100% skema didefinisikan di `supabase/migrations/20261010000000_tatadana_init.sql`.
   - Multi-Wallet dengan penanda default wallet untuk Telegram.
   - Otentikasi Email/Password, Google OAuth, dan verifikasi nomor HP via OTP.
   - Idempotency proteksi transaksi dobel pada webhook Telegram (`update_id`).

3. **Laporan & Export Native:**
   - Tabel transaksi interaktif dengan sorting per kolom, pagination, dan multi-filter.
   - Rincian struk belanja multi-item yang dapat di-expand dalam 1 transaksi utama.
   - Export on-demand ke **PDF** dan **Excel (.xlsx)** langsung di browser.
   - Riwayat export tersimpan.

4. **Admin Dashboard (Superadmin):**
   - Manajemen Multi-Provider AI (Gemini, GPT-4o-mini, DeepSeek) dengan toggle single/failover.
   - Mode Impersonasi User tanpa perlu login ulang.
   - Approval/Reject manual pembayaran Midtrans.
   - Audit logging setiap kali admin mengakses data sensitif transaksi user demi menjaga privasi.

5. **Built-in Telegram Bot Simulator:**
   - Web app dilengkapi tombol simulator di sidebar dan landing page untuk menguji webhook secara live tanpa perlu domain publik eksternal saat tahap pengujian lokal.

---

## 🛠️ Cara Menjalankan

1. **Install Dependencies:**
   ```bash
   npm install
   ```

2. **Jalankan Development Server:**
   ```bash
   npm run dev
   ```
   Aplikasi akan berjalan di `http://localhost:3000`.

3. **Akses Halaman Utama:**
   - **Landing Page:** `http://localhost:3000`
   - **User Dashboard:** `http://localhost:3000/dashboard`
   - **Laporan Keuangan & Export:** `http://localhost:3000/dashboard/laporan`
   - **Admin Control Center:** `http://localhost:3000/admin`
   - **Login / Register:** `http://localhost:3000/login` & `/register`
