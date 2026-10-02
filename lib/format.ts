const gbpFormatter = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
  maximumFractionDigits: 0,
});

export function gbp(n: number): string {
  return gbpFormatter.format(Math.round(n));
}

export function pct(n: number, digits = 2): string {
  return `${Number(n.toFixed(digits))}%`;
}

export function months(n: number): string {
  if (n < 12) return `${n} month${n === 1 ? "" : "s"}`;
  const y = Math.floor(n / 12);
  const m = n % 12;
  const years = `${y} year${y === 1 ? "" : "s"}`;
  return m === 0 ? years : `${years} ${m} month${m === 1 ? "" : "s"}`;
}
