const INDONESIAN_DAYS = [
  'Minggu',
  'Senin',
  'Selasa',
  'Rabu',
  'Kamis',
  'Jumat',
  'Sabtu',
];

const INDONESIAN_MONTHS = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
];

/**
 * Returns date parts shifted to Asia/Jakarta (WIB: UTC+7).
 */
export function getWIBDate(dateInput: Date | string | number = new Date()): Date {
  const d = dateInput ? new Date(dateInput) : new Date();
  if (isNaN(d.getTime())) return new Date();
  // Calculate UTC time and add 7 hours for WIB
  const utc = d.getTime() + d.getTimezoneOffset() * 60000;
  return new Date(utc + 3600000 * 7);
}

/**
 * Format e.g. "Senin, 10 Oktober 2026"
 */
export function formatWIBDate(dateInput?: Date | string | number): string {
  if (!dateInput) return '-';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return '-';
  const wib = getWIBDate(d);
  const dayName = INDONESIAN_DAYS[wib.getDay()];
  const day = wib.getDate();
  const monthName = INDONESIAN_MONTHS[wib.getMonth()];
  const year = wib.getFullYear();
  return `${dayName}, ${day} ${monthName} ${year}`;
}

/**
 * Format e.g. "14:30 WIB"
 */
export function formatWIBTime(dateInput: Date | string | number = new Date()): string {
  const wib = getWIBDate(dateInput);
  const hours = String(wib.getHours()).padStart(2, '0');
  const minutes = String(wib.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes} WIB`;
}

/**
 * Format e.g. "Senin, 10 Oktober 2026 — 14:30 WIB"
 * Spec requirement:
 * 📅 [Hari], [Tanggal] — [Jam WIB]
 */
export function formatWIBDateTime(dateInput: Date | string | number = new Date()): string {
  const wib = getWIBDate(dateInput);
  const dayName = INDONESIAN_DAYS[wib.getDay()];
  const day = wib.getDate();
  const monthName = INDONESIAN_MONTHS[wib.getMonth()];
  const year = wib.getFullYear();
  const hours = String(wib.getHours()).padStart(2, '0');
  const minutes = String(wib.getMinutes()).padStart(2, '0');
  return `${dayName}, ${day} ${monthName} ${year} — ${hours}:${minutes} WIB`;
}

/**
 * Format e.g. "10 Okt 2026"
 */
export function formatWIBShort(dateInput: Date | string | number = new Date()): string {
  const wib = getWIBDate(dateInput);
  const day = wib.getDate();
  const monthShort = INDONESIAN_MONTHS[wib.getMonth()].substring(0, 3);
  const year = wib.getFullYear();
  return `${day} ${monthShort} ${year}`;
}

/**
 * Shift a 24-hour time string ("HH:mm") by a given number of minutes earlier or later.
 * Positive minutesEarlier shifts the time backward / earlier (e.g., "12:00" shifted 10 mins earlier -> "11:50").
 * Handles midnight wrap-around cleanly (e.g., "00:05" shifted 10 mins earlier -> "23:55").
 */
export function shiftTimeMinutes(timeStr: string, minutesEarlier: number): string {
  if (!timeStr || typeof timeStr !== 'string') return '12:00';
  const parts = timeStr.trim().split(':');
  if (parts.length < 2) return timeStr;

  let hours = parseInt(parts[0], 10);
  let minutes = parseInt(parts[1], 10);
  if (isNaN(hours) || isNaN(minutes)) return timeStr;

  let totalMinutes = hours * 60 + minutes - minutesEarlier;
  // Handle 24-hour wrap-around cleanly in O(1) for any integer value
  totalMinutes = ((totalMinutes % 1440) + 1440) % 1440;

  const newHours = Math.floor(totalMinutes / 60);
  const newMinutes = totalMinutes % 60;

  return `${String(newHours).padStart(2, '0')}:${String(newMinutes).padStart(2, '0')}`;
}

export interface BoostCommandResult {
  isBoost: boolean;
  minutes: number;
  level?: number;
  action: 'enable' | 'disable' | 'status' | 'preview';
}

/**
 * Detects if an input string is a boost, percepat, or turbo acceleration command.
 * Distinguishes commands from transactions (e.g. "percepat belanja 50rb" is a transaction, not a command).
 */
export function isBoostOrPercepatCommand(command: string): boolean {
  if (!command || typeof command !== 'string') return false;
  const clean = command.toLowerCase().trim().replace(/[!.,?]+$/, '');
  const isSlashCmd = clean.startsWith('/');
  const withoutSlash = isSlashCmd ? clean.slice(1).trim() : clean;

  // Anti-false-positive checks:
  // 1. Nominal amounts (e.g. 50rb, 100k, 5jt, rp 50.000, 50000) indicate a financial transaction, NOT a command
  const hasNominal = /(\d+\s*(?:rb|ribu|jt|juta|k\b))|(?:rp\.?\s*\d+)|(?:\b\d{4,}\b)|(?:\b\d{1,3}(?:\.\d{3})+\b)/i.test(withoutSlash);
  if (hasNominal) return false;

  // 2. If not a slash command, transaction action verbs (beli, bayar, transfer, belanja, etc.) indicate natural transaction
  if (!isSlashCmd) {
    const hasTransactionVerb = /\b(beli|bayar|transfer|makan|minum|gajian|topup|top\s*up|belanja|ongkir|kirim|tarik|hutang|kopi|pulsa)\b/i.test(withoutSlash);
    if (hasTransactionVerb) return false;
  }

  // Must match either:
  // (A) Starts with boost, percepat, turbo, or Indonesian colloquial slang/typos (percepet, cepet, cpt, cepetan, cepetin, lebih cepet, etc.)
  // (B) Starts with duration expression + speed indicator (e.g. "5 menit lebih cpt", "5 mnt lebih cepat", "5 mnt lbh cpt", "5m lebih cepat")
  const startsWithKeyword = /^(?:boost|percepat|percepet|prcepat|prcepet|turbo|cepetan|cepatan|cepetin|cptan|cptin|cepet|cepat|cpet|cpt|(?:lebih|lbh)\s+(?:cepat|cepet|cpt|cpet))\b/i.test(withoutSlash);
  const startsWithDurationBoost = /^\d+\s*(?:mnt|menit|m\b|min|minutes?)\s+(?:(?:lebih|lbh)\s+)?(?:cepat|cepet|cpt|cpet)\b/i.test(withoutSlash);

  if (!startsWithKeyword && !startsWithDurationBoost) return false;

  // Valid boost command arguments regex:
  // Matches:
  // - Prefix keyword with optional repeated keyword and optional arguments
  // - OR duration-first boost patterns: e.g. "5 menit lebih cpt", "5 mnt lebih cepat", "5m lbh cpt dong"
  const validKeywordPattern = /^(?:boost|percepat|percepet|prcepat|prcepet|turbo|cepetan|cepatan|cepetin|cptan|cptin|cepet|cepat|cpet|cpt|(?:lebih|lbh)\s+(?:cepat|cepet|cpt|cpet))(?:\s+(?:percepat|percepet|prcepat|prcepet|turbo|cepetan|cepatan|cepetin|cptan|cptin|cepet|cepat|cpet|cpt|boost|(?:lebih|lbh)\s+(?:cepat|cepet|cpt|cpet)))?(?:\s+(?:\d+\s*(?:mnt|menit|m\b|min|minutes?)?|(?:lebih|lbh)\s*(?:cepat|cepet|cpt|cpet)|cepat|cepet|cpt|cpet|off|nonaktif|matikan|mati|stop|cancel|batal|disable|non-aktif|reset|status|info|cek|aktif|on|dong|ya|lah|deh|kak|bang|gan|bos|bro|extreme|ekstrem|max|maksimal|level\s*\d+|preview|instan))*$/i;

  const validDurationPattern = /^\d+\s*(?:mnt|menit|m\b|min|minutes?)\s+(?:(?:lebih|lbh)\s+)?(?:cepat|cepet|cpt|cpet)(?:\s+(?:dong|ya|lah|deh|kak|bang|gan|bos|bro|boost|preview|instan|extreme|ekstrem|max|maksimal|status|info|cek|off|nonaktif|reset))*$/i;

  return validKeywordPattern.test(withoutSlash) || validDurationPattern.test(withoutSlash);
}

/**
 * Parses user boost command inputs like:
 * - "/boost percepat", "boost percepat", "/percepat", "percepat"
 * - "/boost percepet", "boost percepet", "/percepet", "cepetan", "cepetin"
 * - "/boost extreme", "/boost max", "/percepat extreme", "/percepat max", "/boost 30"
 * - "/boost 5 menit lebih cpt", "5 mnt lebih cpt", "5 menit lebih cepat", "boost 5 menit"
 * - "/boost 10 mnt lebih cepat", "boost 10 mnt lebih cepat", "/boost 10 mnt lebih cepet"
 * - "/boost 10 menit lebih cepat", "/boost 10m"
 * - "/boost", "/boost 15", "/percepat 15", "/percepet 20", "/boost 5"
 * - "/boost preview", "/boost instan"
 * - "/boost off", "/boost matikan", "/percepat off", "/boost reset"
 * - "/boost status", "/boost info", "/percepat status"
 */
export function parseBoostCommand(command: string): BoostCommandResult {
  if (!command || typeof command !== 'string') {
    return { isBoost: false, minutes: 0, level: 0, action: 'status' };
  }
  const clean = command.toLowerCase().trim().replace(/[!.,?]+$/, '');
  const withoutSlash = clean.startsWith('/') ? clean.slice(1).trim() : clean;

  if (!isBoostOrPercepatCommand(command)) {
    return { isBoost: false, minutes: 0, level: 0, action: 'status' };
  }

  // Check for disable commands: /boost off, /percepat off, /boost nonaktif, /boost matikan, /boost batal, /boost reset
  if (/(?:^|\s)(off|nonaktif|matikan|mati|stop|cancel|batal|disable|non-aktif|reset)(?:\s|$)/i.test(withoutSlash)) {
    return { isBoost: false, minutes: 0, level: 0, action: 'disable' };
  }

  // Check for status commands: /boost status, /percepat status, /boost info, /boost cek
  if (/(?:^|\s)(status|info|cek)(?:\s|$)/i.test(withoutSlash)) {
    return { isBoost: true, minutes: 0, level: 0, action: 'status' };
  }

  // Check for instant reminder preview commands: /boost preview, /percepat preview, /boost instan
  if (/(?:^|\s)(preview|instan)(?:\s|$)/i.test(withoutSlash)) {
    return { isBoost: true, minutes: 30, level: 2, action: 'preview' };
  }

  // Check for Extreme Turbo Mode / Level 2 explicitly:
  // e.g. "/boost extreme", "/percepat max", "/boost level 2", "/boost maksimal", "/turbo extreme"
  const isExtremeKeyword = /(?:^|\s)(extreme|ekstrem|max|maksimal|level\s*2|level\s*3)(?:\s|$)/i.test(withoutSlash);

  // Check for explicit minute specification e.g. "/boost 10 mnt", "/percepat 15 menit", "/boost 30m", "/boost percepat 10 mnt", "/boost 5 menit lebih cpt", "5 mnt lebih cpt"
  const minuteWordMatch = withoutSlash.match(/(\d+)\s*(?:mnt|menit|m\b|min|minutes?)/i);
  if (minuteWordMatch && minuteWordMatch[1]) {
    const mins = parseInt(minuteWordMatch[1], 10);
    if (mins === 0) return { isBoost: false, minutes: 0, level: 0, action: 'disable' };
    const level = mins >= 30 ? 2 : 1;
    return { isBoost: true, minutes: mins > 0 ? mins : 15, level, action: 'enable' };
  }

  // Check for explicit numeric argument directly following command word e.g. "/boost 10", "/percepat 15", "/percepet 20", "/cepet 15", "/boost 30", "/boost 5"
  const directMatch = withoutSlash.match(/(?:boost|percepat|percepet|prcepat|prcepet|turbo|cepetan|cepatan|cepetin|cptan|cptin|cepet|cepat|cpet|cpt|(?:lebih|lbh)\s+(?:cepat|cepet|cpt|cpet))(?:\s+(?:percepat|percepet|prcepat|prcepet|turbo|cepetan|cepatan|cepetin|cptan|cptin|cepet|cepat|cpet|cpt|boost|(?:lebih|lbh)\s+(?:cepat|cepet|cpt|cpet)))?\s+(\d+)/i);
  if (directMatch && directMatch[1]) {
    const mins = parseInt(directMatch[1], 10);
    if (mins === 0) return { isBoost: false, minutes: 0, level: 0, action: 'disable' };
    const level = mins >= 30 ? 2 : 1;
    return { isBoost: true, minutes: mins > 0 ? mins : 15, level, action: 'enable' };
  }

  if (isExtremeKeyword) {
    return { isBoost: true, minutes: 30, level: 2, action: 'enable' };
  }

  // If no explicit numeric value is provided:
  // Commands containing "percepat", "percepet", "cepet", "cepetan", "cepetin", "cpt", "lebih cepet", or "turbo"
  // activate Turbo Boost acceleration defaulting to 15 minutes (Level 1).
  // Note: if invoked repeatedly when already active at Level 1, runtime handlers will escalate to Level 2 (30 minutes).
  // Standard bare /boost defaults to 10 minutes.
  const isExplicitPercepat =
    withoutSlash.includes('percepat') ||
    withoutSlash.includes('percepet') ||
    withoutSlash.includes('prcepat') ||
    withoutSlash.includes('prcepet') ||
    withoutSlash.includes('cepetan') ||
    withoutSlash.includes('cepetin') ||
    withoutSlash.includes('cepet') ||
    withoutSlash.includes('cepat') ||
    withoutSlash.includes('cpet') ||
    withoutSlash.includes('cpt') ||
    withoutSlash.includes('turbo');
  const defaultMinutes = isExplicitPercepat ? 15 : 10;

  return { isBoost: true, minutes: defaultMinutes, level: 1, action: 'enable' };
}

/**
 * Calculates effective reminder times given original schedule and boost configuration.
 */
export function getEffectiveReminderTimes(params: {
  time1?: string;
  time2?: string;
  boostMode?: boolean;
  boostMinutes?: number;
  boostLevel?: number;
}): { time1: string; time2: string; isBoosted: boolean; bufferMinutes: number; boostLevel: number } {
  const orig1 = params.time1 || '12:00';
  const orig2 = params.time2 || '20:00';
  const isBoosted = Boolean(params.boostMode);
  const bufferMinutes = isBoosted ? (params.boostMinutes && params.boostMinutes > 0 ? params.boostMinutes : 10) : 0;
  const boostLevel = isBoosted ? (params.boostLevel || (bufferMinutes >= 30 ? 2 : 1)) : 0;

  return {
    time1: bufferMinutes > 0 ? shiftTimeMinutes(orig1, bufferMinutes) : orig1,
    time2: bufferMinutes > 0 ? shiftTimeMinutes(orig2, bufferMinutes) : orig2,
    isBoosted,
    bufferMinutes,
    boostLevel,
  };
}

