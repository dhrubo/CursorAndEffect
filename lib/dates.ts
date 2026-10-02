/** Local calendar helpers. Dates are YYYY-MM-DD so tests do not depend on UTC. */

export function isoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function monthKey(date: Date): string {
  return isoDate(date).slice(0, 7);
}

export function addMonths(iso: string, count: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  return isoDate(new Date(y, m - 1 + count, d));
}

export function daysBetween(earlier: string, later: string): number {
  const a = Date.parse(`${earlier}T00:00:00Z`);
  const b = Date.parse(`${later}T00:00:00Z`);
  return Math.round((b - a) / 86_400_000);
}

export function formatUkDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

const SPOKEN_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Day and short month, for example "2 Nov". */
export function spokenDate(iso: string): string {
  const [, month, day] = iso.split("-").map(Number);
  return `${day} ${SPOKEN_MONTHS[month - 1] ?? ""}`;
}
