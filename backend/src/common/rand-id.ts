import { randomInt } from 'crypto';

/**
 * Short public identifier: 6 lowercase base36 chars.
 *
 *   [ ddd ][ rrr ]
 *     │      └── 3 random chars  → 36³ = 46,656 ids per day
 *     └───────── days since 2026-01-01 in base36 → valid until ~2153
 *
 * Because the prefix is the creation day, sorting by randId also sorts
 * (roughly) by creation date; exact ordering uses the numeric `rowId`.
 */
export const RAND_ID_EPOCH = Date.UTC(2026, 0, 1);
export const RAND_ID_LENGTH = 6;
export const RAND_ID_PATTERN = /^[0-9a-z]{6}$/;

const DAY_MS = 24 * 60 * 60 * 1000;
const ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyz';

export function generateRandId(now: Date = new Date()): string {
  const days = Math.max(0, Math.floor((now.getTime() - RAND_ID_EPOCH) / DAY_MS));
  const prefix = days.toString(36).padStart(3, '0').slice(-3);

  let suffix = '';
  for (let i = 0; i < 3; i++) suffix += ALPHABET[randomInt(36)];

  return prefix + suffix;
}

/** Creation day encoded in a randId (UTC midnight). */
export function randIdDate(randId: string): Date {
  return new Date(RAND_ID_EPOCH + parseInt(randId.slice(0, 3), 36) * DAY_MS);
}
