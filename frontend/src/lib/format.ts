import type { AccountType } from "./api";

export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  BANK: "حساب بانکی",
  CARD: "کارت",
  CASH: "نقدی",
  DIGITAL_WALLET: "کیف پول دیجیتال",
};

export function formatToman(amount: number): string {
  return `${amount.toLocaleString("fa-IR")} تومان`;
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fa-IR");
}

/** `YYYY-MM-DD` for today, as used by <input type="date">. */
export function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/** `YYYY-MM`; the backend groups by Gregorian month in UTC. */
export function currentMonth(): string {
  return new Date().toISOString().slice(0, 7);
}

export function monthLabel(month: string): string {
  return new Date(`${month}-01T00:00:00Z`).toLocaleDateString("fa-IR-u-ca-gregory", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}
