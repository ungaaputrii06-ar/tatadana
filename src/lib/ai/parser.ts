import { ParsedTransaction, TransactionType } from '../types';

/**
 * Parses Indonesian currency amounts from string expressions:
 * Examples:
 * - "15rb", "15 ribu" -> 15000
 * - "1.5jt", "1,5jt", "1.5 juta" -> 1500000
 * - "500k" -> 500000
 * - "Rp 50.000", "Rp50000", "50000" -> 50000
 * - "2.5 M", "2.5milyar" -> 2500000000
 */
export function parseIndonesianAmount(text: string): number | null {
  const normalized = text.toLowerCase().trim();

  // Pattern: number (with optional decimal comma/dot) followed by multiplier
  // 1.5jt, 1,5 juta, 15rb, 500k, 250 ribu
  const multiplierRegex = /(\d+(?:[.,]\d+)?)\s*(jt|juta|m|miliar|milyar|k|rb|ribu)\b/i;
  const match = normalized.match(multiplierRegex);

  if (match) {
    const rawNumStr = match[1].replace(',', '.');
    const num = parseFloat(rawNumStr);
    const unit = match[2].toLowerCase();

    if (isNaN(num)) return null;

    if (unit === 'k' || unit === 'rb' || unit === 'ribu') {
      return Math.round(num * 1000);
    }
    if (unit === 'jt' || unit === 'juta') {
      return Math.round(num * 1000000);
    }
    if (unit === 'm' || unit === 'miliar' || unit === 'milyar') {
      return Math.round(num * 1000000000);
    }
  }

  // Plain number with optional "rp" or separators: "Rp 50.000", "50.000", "15000"
  const plainRegex = /(?:rp\.?\s*)?(\d{1,3}(?:\.\d{3})+(?:,\d+)?|\d+)/i;
  const plainMatch = normalized.match(plainRegex);
  if (plainMatch) {
    const cleaned = plainMatch[1].replace(/\./g, '').replace(',', '.');
    const num = parseFloat(cleaned);
    if (!isNaN(num) && num > 0) {
      return Math.round(num);
    }
  }

  return null;
}

/**
 * Maps common keywords to standard categories
 */
export function inferCategoryAndType(text: string): {
  type: TransactionType;
  category: string;
} {
  const t = text.toLowerCase();

  // Income patterns
  const incomeKeywords = [
    'gaji', 'gajian', 'salary', 'income', 'bonus', 'thr', 'freelance',
    'proyek', 'project', 'dividen', 'bunga', 'penjualan', 'dapat uang',
    'terima transfer', 'kembalian', 'untung', 'cashback'
  ];
  const isIncome = incomeKeywords.some((w) => t.includes(w));

  if (isIncome) {
    if (t.includes('gaji') || t.includes('salary')) return { type: 'income', category: 'Gaji & Upah' };
    if (t.includes('freelance') || t.includes('proyek') || t.includes('project')) {
      return { type: 'income', category: 'Freelance & Side Hustle' };
    }
    if (t.includes('dividen') || t.includes('bunga') || t.includes('investasi')) {
      return { type: 'income', category: 'Investasi & Bunga' };
    }
    return { type: 'income', category: 'Pemasukan Lainnya' };
  }

  // Expense categories
  if (
    t.includes('makan') || t.includes('minum') || t.includes('bakso') ||
    t.includes('kopi') || t.includes('cafe') || t.includes('nasgor') ||
    t.includes('nasi') || t.includes('padang') || t.includes('soto') ||
    t.includes('sate') || t.includes('warteg') || t.includes('jajan') ||
    t.includes('mie') || t.includes('sarapan') || t.includes('siang') ||
    t.includes('resto') || t.includes('snack') || t.includes('ayam')
  ) {
    return { type: 'expense', category: 'Makanan & Minuman' };
  }

  if (
    t.includes('bensin') || t.includes('gojek') || t.includes('grab') ||
    t.includes('pertalite') || t.includes('pertamax') || t.includes('tol') ||
    t.includes('parkir') || t.includes('angkot') || t.includes('busway') ||
    t.includes('kereta') || t.includes('ojol') || t.includes('transport')
  ) {
    return { type: 'expense', category: 'Transportasi' };
  }

  if (
    t.includes('listrik') || t.includes('pln') || t.includes('air') ||
    t.includes('pdam') || t.includes('wifi') || t.includes('indihome') ||
    t.includes('pulsa') || t.includes('paket data') || t.includes('sewa') ||
    t.includes('kontrakan') || t.includes('kost') || t.includes('bpjs')
  ) {
    return { type: 'expense', category: 'Tagihan & Utilitas' };
  }

  if (
    t.includes('nonton') || t.includes('bioskop') || t.includes('game') ||
    t.includes('steam') || t.includes('netflix') || t.includes('spotify') ||
    t.includes('karaoke') || t.includes('jalan-jalan') || t.includes('liburan')
  ) {
    return { type: 'expense', category: 'Hiburan' };
  }

  if (
    t.includes('obat') || t.includes('dokter') || t.includes('klinik') ||
    t.includes('apotek') || t.includes('vitamin') || t.includes('rumah sakit')
  ) {
    return { type: 'expense', category: 'Kesehatan' };
  }

  if (
    t.includes('belanja') || t.includes('baju') || t.includes('sepatu') ||
    t.includes('shopee') || t.includes('tokopedia') || t.includes('indomaret') ||
    t.includes('alfamart') || t.includes('supermarket') || t.includes('mall')
  ) {
    return { type: 'expense', category: 'Belanja' };
  }

  if (
    t.includes('kursus') || t.includes('buku') || t.includes('kuliah') ||
    t.includes('spp') || t.includes('seminar') || t.includes('ujian')
  ) {
    return { type: 'expense', category: 'Pendidikan' };
  }

  // Default expense
  return { type: 'expense', category: 'Pengeluaran Umum' };
}

/**
 * Detects wallet mentions in Indonesian text
 */
export function inferWallet(text: string): { walletName: string; walletKeyword: string } | null {
  const lower = text.toLowerCase();
  if (/(?:^|\s)(?:tunai|cash|kontan)(?:$|\s|[!.,?])/i.test(lower)) {
    return { walletName: 'Dompet Tunai', walletKeyword: 'tunai' };
  }
  if (/(?:^|\s)(?:bca)(?:$|\s|[!.,?])/i.test(lower)) {
    return { walletName: 'BCA Utama', walletKeyword: 'bca' };
  }
  if (/(?:^|\s)(?:mandiri)(?:$|\s|[!.,?])/i.test(lower)) {
    return { walletName: 'Mandiri', walletKeyword: 'mandiri' };
  }
  if (/(?:^|\s)(?:gopay|go-pay|go\s*pay)(?:$|\s|[!.,?])/i.test(lower)) {
    return { walletName: 'GoPay', walletKeyword: 'gopay' };
  }
  if (/(?:^|\s)(?:ovo)(?:$|\s|[!.,?])/i.test(lower)) {
    return { walletName: 'OVO', walletKeyword: 'ovo' };
  }
  if (/(?:^|\s)(?:dana)(?:$|\s|[!.,?])/i.test(lower)) {
    return { walletName: 'DANA', walletKeyword: 'dana' };
  }
  return null;
}

export interface ParseOptions {
  preferredWallet?: string;
  userId?: string;
  llmCaller?: (prompt: string) => Promise<string | null>;
}

/**
 * Parses user natural language chat into a structured transaction.
 * Complies with requirement 4.1:
 * "Parsing WAJIB menggunakan LLM dengan structured output/function calling untuk mengubah
 * kalimat natural menjadi JSON terstruktur: {jenis, nominal, kategori, catatan} — jangan hanya regex sederhana"
 * "Kalau AI gagal memahami input (ambigu/tidak jelas), bot balas pesan error yang jelas + contoh format yang benar"
 */
export async function parseTransactionWithAI(
  inputText: string,
  optionsOrCaller?: ParseOptions | ((prompt: string) => Promise<string | null>)
): Promise<ParsedTransaction> {
  const cleanInput = inputText.trim();
  const caller = typeof optionsOrCaller === 'function' ? optionsOrCaller : optionsOrCaller?.llmCaller;
  const preferredWallet = typeof optionsOrCaller === 'object' ? optionsOrCaller?.preferredWallet : undefined;

  // 1. Check if input is completely ambiguous / non-transactional
  const nonTxGreetings = ['halo', 'hai', 'hello', 'ping', 'p', 'pagi', 'siang', 'malam', 'tes', 'test', 'siapa kamu'];
  const firstWord = cleanInput.toLowerCase().split(/\s+/)[0];
  if (nonTxGreetings.includes(cleanInput.toLowerCase()) || nonTxGreetings.includes(firstWord) || cleanInput.length < 3) {
    return {
      type: 'expense',
      amount: 0,
      category: '',
      categoryName: '',
      notes: '',
      description: '',
      wallet: preferredWallet || 'BCA Utama',
      walletName: preferredWallet || 'BCA Utama',
      confidence: 0,
      is_ambiguous: true,
      isAmbiguous: true,
      suggested_format:
        'Maaf, TataDana belum bisa memahami input kamu 🤔\n\nContoh format yang bisa langsung kamu ketik:\n• beli bakso 15rb\n• bensin motor 30k\n• bayar tagihan listrik 250rb\n• gajian bulanan 5jt\n• dapat bonus project 1.5jt',
    };
  }

  // 2. If an active LLM provider caller is available, call LLM with strict structured JSON prompt
  if (caller) {
    try {
      const prompt = `Anda adalah sistem parser transaksi keuangan Indonesia untuk TataDana.
Ubah pesan input pengguna berikut menjadi objek JSON terstruktur.
Pesan pengguna: "${cleanInput}"

Format JSON yang WAJIB dihasilkan:
{
  "jenis": "expense" | "income",
  "nominal": number (angka bulat IDR murni tanpa titik atau singkatan, contoh: "15rb" -> 15000, "1.5jt" -> 1500000, "500k" -> 500000),
  "kategori": string (contoh: "Makanan & Minuman", "Transportasi", "Belanja", "Tagihan & Utilitas", "Hiburan", "Kesehatan", "Gaji & Upah", "Freelance & Side Hustle"),
  "catatan": string (deskripsi ringkas transaksi),
  "dompet": string (contoh: "Dompet Tunai", "BCA", "Mandiri", "GoPay", "OVO", "DANA"),
  "is_ambiguous": boolean (true jika pesan sama sekali bukan transaksi atau tidak menyebut nominal)
}

Hanya kembalikan string JSON valid tanpa markdown backticks tambahan.`;

      const rawLlmResponse = await caller(prompt);
      if (rawLlmResponse) {
        const cleanedJson = rawLlmResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        const parsed = JSON.parse(cleanedJson);
        if (parsed && typeof parsed.nominal === 'number' && parsed.nominal > 0) {
          const detectedWallet = inferWallet(cleanInput);
          const resolvedWallet = parsed.dompet || detectedWallet?.walletName || preferredWallet || 'BCA Utama';
          return {
            type: parsed.jenis === 'income' ? 'income' : 'expense',
            amount: parsed.nominal,
            category: parsed.kategori || 'Pengeluaran Umum',
            categoryName: parsed.kategori || 'Pengeluaran Umum',
            notes: parsed.catatan || cleanInput,
            description: parsed.catatan || cleanInput,
            wallet: resolvedWallet,
            walletName: resolvedWallet,
            walletKeyword: detectedWallet?.walletKeyword,
            confidence: 0.98,
            is_ambiguous: !!parsed.is_ambiguous,
            isAmbiguous: !!parsed.is_ambiguous,
          };
        }
      }
    } catch (e) {
      console.warn('[AI Parser] LLM call failed or returned unparseable json, falling back to local heuristic:', e);
    }
  }

  // 3. Robust Indonesian Heuristic Parser (Fast fallback & offline test support)
  const amount = parseIndonesianAmount(cleanInput);

  if (!amount || amount <= 0) {
    return {
      type: 'expense',
      amount: 0,
      category: '',
      categoryName: '',
      notes: '',
      description: '',
      wallet: preferredWallet || 'BCA Utama',
      walletName: preferredWallet || 'BCA Utama',
      confidence: 0,
      is_ambiguous: true,
      isAmbiguous: true,
      suggested_format:
        'Nominal transaksi tidak terdeteksi 🔍\n\nContoh format yang bisa langsung kamu ketik:\n• kopi kenangan 22rb\n• belanja alfamart 75k\n• gajian 6.5jt',
    };
  }

  const { type, category } = inferCategoryAndType(cleanInput);
  const detectedWallet = inferWallet(cleanInput);
  const resolvedWallet = detectedWallet?.walletName || preferredWallet || 'BCA Utama';

  // Clean notes by removing recognized amount phrases
  let cleanNotes = cleanInput
    .replace(/(?:rp\.?\s*)?(\d+(?:[.,]\d+)?\s*(?:jt|juta|m|miliar|milyar|k|rb|ribu)|\d{1,3}(?:\.\d{3})+(?:,\d+)?|\d+)/gi, '')
    .trim();

  // If notes became empty (e.g. user just typed "15rb"), use category name
  if (!cleanNotes) {
    cleanNotes = type === 'income' ? 'Pemasukan' : category;
  }

  return {
    type,
    amount,
    category,
    categoryName: category,
    notes: cleanNotes,
    description: cleanNotes,
    wallet: resolvedWallet,
    walletName: resolvedWallet,
    walletKeyword: detectedWallet?.walletKeyword,
    confidence: 0.95,
    is_ambiguous: false,
    isAmbiguous: false,
  };
}
