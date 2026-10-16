import type { ISODate, MonthKey } from "@/types/api";

/** Today's date (YYYY-MM-DD) in the given IANA timezone (defaults to the browser's). */
export function todayISO(timeZone?: string): ISODate {
  // The en-CA locale formats dates as YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function currentMonth(timeZone?: string): MonthKey {
  return todayISO(timeZone).slice(0, 7);
}

export function shiftMonth(month: MonthKey, delta: number): MonthKey {
  const [year, mon] = month.split("-").map(Number);
  const index = (year ?? 1970) * 12 + ((mon ?? 1) - 1) + delta;
  const newYear = Math.floor(index / 12);
  const newMonth = (index % 12) + 1;
  return `${newYear}-${String(newMonth).padStart(2, "0")}`;
}

export function monthRange(month: MonthKey): { from: ISODate; to: ISODate } {
  const [year, mon] = month.split("-").map(Number);
  const lastDay = new Date(year ?? 1970, mon ?? 1, 0).getDate();
  return { from: `${month}-01`, to: `${month}-${String(lastDay).padStart(2, "0")}` };
}

export function isValidISODate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year ?? 0, (month ?? 1) - 1, day ?? 1);
  return date.getFullYear() === year && date.getMonth() + 1 === month && date.getDate() === day;
}

export function isValidMonth(value: string | null): value is MonthKey {
  return value !== null && /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
}
