/** Peso formatting helpers. Hermes on Android has unreliable Intl support, so we format by hand. */
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Intl currency formatting is unreliable on Hermes/Android, so format pesos by hand. */
export function formatMoney(value: number | null | undefined): string {
  const amount = Number(value || 0);
  const [whole, cents] = amount.toFixed(2).split(".");
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `₱${grouped}.${cents}`;
}

export function formatMoneyCompact(value: number): string {
  const amount = Number(value || 0);
  if (amount >= 1000) return `₱${(amount / 1000).toFixed(amount % 1000 === 0 ? 0 : 1)}k`;
  return `₱${Math.round(amount)}`;
}

/** "2026-09-05" -> "Sep 5, 2026" */
export function formatDate(key: string | null | undefined): string {
  if (!key) return "not set";
  const [year, month, day] = key.split("-").map(Number);
  if (!year || !month || !day) return key;
  return `${MONTHS_SHORT[month - 1]} ${day}, ${year}`;
}

/** "2026-09-05" -> "September 2026" */
export function formatMonthYear(key: string): string {
  const [year, month] = key.split("-").map(Number);
  return `${MONTHS[(month || 1) - 1]} ${year}`;
}

export function toDateKey(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

export function todayKey(): string {
  return toDateKey(new Date());
}

export function isValidDateKey(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

export function greetingForHour(hour: number): string {
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

/** Whole days from today until a YYYY-MM-DD date (negative = already past). */
export function daysUntil(dateKey: string): number {
  const [year, month, day] = dateKey.split("-").map(Number);
  if (!year || !month || !day) return 0;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const due = new Date(year, month - 1, day);
  return Math.round((due.getTime() - today.getTime()) / 86_400_000);
}

export type CountdownTone = "muted" | "yellow" | "coral";

/** "Due today" / "Due in 3d" / "Overdue 2d" with an urgency color. */
export function dueCountdown(dateKey: string): { label: string; tone: CountdownTone } {
  const days = daysUntil(dateKey);
  if (days < 0) return { label: `Overdue ${Math.abs(days)}d`, tone: "coral" };
  if (days === 0) return { label: "Due today", tone: "coral" };
  if (days === 1) return { label: "Due tomorrow", tone: "yellow" };
  if (days <= 3) return { label: `Due in ${days}d`, tone: "yellow" };
  return { label: `Due in ${days}d`, tone: "muted" };
}

export function initialsOf(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "--";
}

/** Equal split of a bill across the active renters (the house rule for now). */
export function personalShare(amount: number, renterCount: number): number {
  return Number(amount || 0) / Math.max(renterCount, 1);
}
