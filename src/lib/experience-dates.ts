const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** 'YYYY-MM' -> 'Jul 2026' */
export function formatMonth(ym: string): string {
  const [year, month] = ym.split('-').map(Number);
  return `${MONTHS[(month ?? 1) - 1] ?? ''} ${year ?? ''}`;
}

/** 'May 2024 – Jul 2026', or 'Jul 2026 – Present' for a current role. */
export function periodLabel(start: string, end?: string): string {
  return `${formatMonth(start)} – ${end ? formatMonth(end) : 'Present'}`;
}
