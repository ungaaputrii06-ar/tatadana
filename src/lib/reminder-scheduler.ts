// ==========================================================
// TATADANA REMINDER SCHEDULER & TURBO BOOST ENGINE
// Manages reminder schedules, evaluates early notification triggers,
// and applies the Turbo Boost 10-minute acceleration buffer.
// ==========================================================

import { mockStore } from './supabase/mock-store';
import { dataStore } from './storage-mock';
import { ReminderSetting, UserProfile } from './types';
import { shiftTimeMinutes, getWIBDate } from './utils/date';
import { formatDailyReminder } from './telegram-parser';
import { fastCache } from './cache';

export interface BoostedReminderInfo {
  userId: string;
  isActive: boolean;
  boostMode: boolean;
  boostMinutes: number;
  boostLevel: number;
  originalTimes: { time1: string; time2?: string };
  effectiveTimes: { time1: string; time2?: string };
  previewAction?: string;
  previewMessage?: string;
}

/**
 * Returns formatted Instant Reminder Preview text for Extreme Turbo mode.
 */
export function formatInstantReminderPreview(): string {
  return `🔔 *Preview Pengingat Instan TataDana (Mode Turbo)*\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n` +
    `⏰ *Waktu Disimulasikan:* Siap dikirim seketika\n\n` +
    `⏰ *Reminder Keuangan TataDana!*\n` +
    `Halo Sobat! Jangan lupa catat transaksi keuangan hari ini agar rekap akhir bulan tetap rapi.\n\n` +
    `💡 *Format Pencatatan Kilat:*\n` +
    `• "kopi susu 25k"\n` +
    `• "makan siang 35rb"\n` +
    `• "bensin 50k"\n\n` +
    `⚡ Mode Turbo Aktif: Notifikasi dijadwalkan lebih awal untuk memastikan kamu tidak pernah lupa mencatat!`;
}

/**
 * Applies Turbo Boost to a user's reminder configuration.
 * By default, shifts reminder dispatch 10 minutes (Level 1) or 30 minutes (Level 2).
 */
export function applyTurboBoost(
  userId: string,
  boostMinutes: number = 10,
  boostLevel?: number
): BoostedReminderInfo {
  let effectiveMinutes = boostMinutes > 0 ? boostMinutes : 10;
  let level = boostLevel !== undefined ? boostLevel : (effectiveMinutes >= 30 ? 2 : 1);
  if (level === 2 && effectiveMinutes < 30) {
    effectiveMinutes = 30;
  }

  // 1. Update in mockStore
  let rem = mockStore.reminders.get(userId);
  if (!rem) {
    rem = {
      id: 'rem-' + userId,
      user_id: userId,
      is_active: true,
      frequency: '2x',
      time_1: '12:00',
      time_2: '20:00',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }

  const orig1 = rem.time_1 || '12:00';
  const orig2 = rem.time_2 || '20:00';
  const effective1 = shiftTimeMinutes(orig1, effectiveMinutes);
  const effective2 = shiftTimeMinutes(orig2, effectiveMinutes);

  rem.boost_mode = true;
  rem.boostMode = true;
  rem.boost_minutes = effectiveMinutes;
  rem.boostMinutes = effectiveMinutes;
  rem.boost_level = level;
  rem.boostLevel = level;
  rem.updated_at = new Date().toISOString();
  mockStore.reminders.set(userId, rem);

  // 2. Also update in dataStore for client-side demo state
  if (dataStore && dataStore.reminderConfig) {
    dataStore.reminderConfig.boost_mode = true;
    dataStore.reminderConfig.boostMode = true;
    dataStore.reminderConfig.boost_minutes = effectiveMinutes;
    dataStore.reminderConfig.boostMinutes = effectiveMinutes;
    dataStore.reminderConfig.boost_level = level;
    dataStore.reminderConfig.boostLevel = level;
  }

  const res: BoostedReminderInfo = {
    userId,
    isActive: Boolean(rem.is_active || rem.isActive),
    boostMode: true,
    boostMinutes: effectiveMinutes,
    boostLevel: level,
    originalTimes: { time1: orig1, time2: orig2 },
    effectiveTimes: { time1: effective1, time2: effective2 },
    previewAction: level === 2 ? 'Instant preview ready (Level 2 Extreme Turbo)' : 'Standard preview ready (Level 1 Turbo)',
    previewMessage: formatDailyReminder(),
  };

  fastCache.set(`boost:info:${userId}`, res, 60_000);
  fastCache.del(`settings:${userId}`);
  fastCache.del(`reminders:${userId}`);
  return res;
}

/**
 * Escalate a user's boost configuration to the next stepped level:
 * - Level 0 (inactive) -> Level 1 (15m buffer)
 * - Level 1 (10m or 15m) -> Level 2 (30m buffer - Extreme Turbo)
 * - Level 2 (30m) -> confirms Level 2 Extreme Turbo
 */
export function escalateTurboBoost(userId: string): BoostedReminderInfo {
  const current = getBoostedReminderInfo(userId);
  if (!current.boostMode || current.boostMinutes === 0) {
    return applyTurboBoost(userId, 15, 1);
  }
  if (current.boostMinutes < 15) {
    return applyTurboBoost(userId, 15, 1);
  }
  return applyTurboBoost(userId, 30, 2);
}

/**
 * Disables Turbo Boost on a user's reminder configuration.
 */
export function disableTurboBoost(userId: string): BoostedReminderInfo {
  let rem = mockStore.reminders.get(userId);
  if (rem) {
    rem.boost_mode = false;
    rem.boostMode = false;
    rem.boost_minutes = 0;
    rem.boostMinutes = 0;
    rem.boost_level = 0;
    rem.boostLevel = 0;
    rem.updated_at = new Date().toISOString();
    mockStore.reminders.set(userId, rem);
  }

  if (dataStore && dataStore.reminderConfig) {
    dataStore.reminderConfig.boost_mode = false;
    dataStore.reminderConfig.boostMode = false;
    dataStore.reminderConfig.boost_minutes = 0;
    dataStore.reminderConfig.boostMinutes = 0;
    dataStore.reminderConfig.boost_level = 0;
    dataStore.reminderConfig.boostLevel = 0;
  }

  const orig1 = rem?.time_1 || rem?.time1 || '12:00';
  const orig2 = rem?.time_2 || rem?.time2 || '20:00';

  const res: BoostedReminderInfo = {
    userId,
    isActive: Boolean(rem?.is_active || rem?.isActive),
    boostMode: false,
    boostMinutes: 0,
    boostLevel: 0,
    originalTimes: { time1: orig1, time2: orig2 },
    effectiveTimes: { time1: orig1, time2: orig2 },
  };

  fastCache.set(`boost:info:${userId}`, res, 60_000);
  fastCache.del(`settings:${userId}`);
  fastCache.del(`reminders:${userId}`);
  return res;
}

/**
 * Calculates current effective reminder times for a given user or configuration.
 * Leverages in-memory fastCache to achieve < 5ms retrieval latencies.
 */
export function getBoostedReminderInfo(userId: string): BoostedReminderInfo {
  const cacheKey = `boost:info:${userId}`;
  const cached = fastCache.get<BoostedReminderInfo>(cacheKey);
  if (cached) {
    return cached;
  }

  const rem = mockStore.reminders.get(userId) || dataStore.reminderConfig || {
    time_1: '12:00',
    time_2: '20:00',
    is_active: true,
    boost_mode: false,
    boost_minutes: 10,
    boost_level: 0,
  };

  const orig1 = rem.time_1 || rem.time1 || '12:00';
  const orig2 = rem.time_2 || rem.time2 || '20:00';
  const isBoosted = Boolean(rem.boost_mode || rem.boostMode);
  const minutes = isBoosted ? (rem.boost_minutes ?? rem.boostMinutes ?? 10) : 0;
  const level = isBoosted ? (rem.boost_level || rem.boostLevel || (minutes >= 30 ? 2 : 1)) : 0;

  const info: BoostedReminderInfo = {
    userId,
    isActive: rem.is_active !== undefined ? Boolean(rem.is_active) : (rem.isActive !== undefined ? Boolean(rem.isActive) : true),
    boostMode: isBoosted,
    boostMinutes: minutes,
    boostLevel: level,
    originalTimes: { time1: orig1, time2: orig2 },
    effectiveTimes: {
      time1: isBoosted ? shiftTimeMinutes(orig1, minutes) : orig1,
      time2: isBoosted ? shiftTimeMinutes(orig2, minutes) : orig2,
    },
    previewAction: isBoosted ? (level === 2 ? 'Instant preview ready (Level 2 Extreme Turbo)' : 'Standard preview ready') : undefined,
    previewMessage: formatDailyReminder(),
  };

  fastCache.set(cacheKey, info, 60_000);
  return info;
}

/**
 * Checks all active reminders to see which ones are due for delivery right now (WIB).
 * Accounts for Turbo Boost buffer (e.g. 10m, 15m, or 30m Level 2 Extreme Turbo).
 */
export function checkDueReminders(overrideTimeWIB?: string): {
  dueCount: number;
  triggered: Array<{
    userId: string;
    effectiveTime: string;
    originalTime: string;
    isBoosted: boolean;
    boostLevel?: number;
    message: string;
  }>;
} {
  const currentTime = overrideTimeWIB || (() => {
    const wib = getWIBDate();
    const h = String(wib.getHours()).padStart(2, '0');
    const m = String(wib.getMinutes()).padStart(2, '0');
    return `${h}:${m}`;
  })();

  const triggered: Array<{
    userId: string;
    effectiveTime: string;
    originalTime: string;
    isBoosted: boolean;
    boostLevel?: number;
    message: string;
  }> = [];

  for (const [userId, rem] of mockStore.reminders.entries()) {
    if (!rem.is_active && !rem.isActive) continue;

    const info = getBoostedReminderInfo(userId);
    const time1Match = info.effectiveTimes.time1 === currentTime;
    const time2Match = info.effectiveTimes.time2 === currentTime;

    if (time1Match || time2Match) {
      const effectiveTime = time1Match ? info.effectiveTimes.time1 : (info.effectiveTimes.time2 || '');
      const originalTime = time1Match ? info.originalTimes.time1 : (info.originalTimes.time2 || '');

      triggered.push({
        userId,
        effectiveTime,
        originalTime,
        isBoosted: info.boostMode,
        boostLevel: info.boostLevel,
        message: formatDailyReminder(),
      });

      // Update last sent timestamp
      rem.last_sent_at = new Date().toISOString();
      mockStore.reminders.set(userId, rem);
    }
  }

  return {
    dueCount: triggered.length,
    triggered,
  };
}
