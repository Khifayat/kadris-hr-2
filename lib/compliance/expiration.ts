import type { ExpirationResult } from "./types";

const MILLISECONDS_PER_DAY = 86_400_000;

function utcDateOnly(value: Date): number {
  return Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate());
}

/** Credentials are valid through their expiration date. */
export function categorizeExpiration(
  expirationDate: Date,
  reminderDays: readonly number[] = [60, 30, 7],
  now: Date = new Date(),
): ExpirationResult {
  const daysRemaining = Math.round(
    (utcDateOnly(expirationDate) - utcDateOnly(now)) / MILLISECONDS_PER_DAY,
  );
  const thresholds = [...new Set(reminderDays)]
    .filter((days) => Number.isInteger(days) && days >= 0)
    .sort((a, b) => b - a);

  if (daysRemaining < 0) {
    return { category: "EXPIRED", daysRemaining, nextReminderDay: null };
  }

  const category = thresholds.some((days) => daysRemaining <= days)
    ? "EXPIRING_SOON"
    : "VALID";
  const nextReminderDay = thresholds
    .slice()
    .reverse()
    .find((days) => days < daysRemaining) ?? null;

  return { category, daysRemaining, nextReminderDay };
}
