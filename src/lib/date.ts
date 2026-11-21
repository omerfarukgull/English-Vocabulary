import { locale } from './i18n';
export const DAY = 86400000;
export function dayKey(t: number = Date.now()): string {
  const d = new Date(t);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
export function startOfDay(t: number = Date.now()): number {
  const d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime();
}
export function addDays(key: string, n: number): string {
  const [y, m, d] = key.split('-').map(Number);
  return dayKey(new Date(y, m - 1, d + n, 12).getTime());
}
export function formatDayShort(key: string): string {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(locale(), { weekday: 'short' });
}
export function formatDayLong(key: string): string {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(locale(), { weekday: 'long', day: 'numeric', month: 'long' });
}
