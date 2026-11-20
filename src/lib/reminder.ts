// Günlük hatırlatma. Dürüst sınırlar:
// - Sunucu ve push servisi kullanılmadığı için "tam saatinde" bildirim tarayıcı açıkken (arka planda bile olsa) garanti edilir.
// - Uygulama tamamen kapalıyken bildirim yalnızca Android'de yüklü PWA + periodic background sync destekleyen
//   tarayıcılarda (Chrome/Edge) gelir ve zamanını tarayıcı belirler (saat geçtikten sonraki ilk uygun an).
// - iPhone/iPad (Safari) kapalı uygulamaya yerel zamanlanmış bildirim desteklemez; orada takvim hatırlatıcısı (.ics) kullanılır.
import { getState } from './store';
import { dayKey } from './date';

export const notifySupported = typeof window !== 'undefined' && 'Notification' in window && 'serviceWorker' in navigator;
export const isIOS = typeof navigator !== 'undefined' && (/iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));

export async function periodicSupported(): Promise<boolean> {
  try { const reg = await navigator.serviceWorker?.ready; return !!reg && 'periodicSync' in reg; } catch { return false; }
}

export async function enableReminder(): Promise<{ permission: NotificationPermission | 'unsupported'; background: boolean }> {
  if (!notifySupported) return { permission: 'unsupported', background: false };
  const permission = Notification.permission === 'default' ? await Notification.requestPermission() : Notification.permission;
  let background = false;
  if (permission === 'granted') {
    try {
      const reg = await navigator.serviceWorker.ready as ServiceWorkerRegistration & { periodicSync?: { register: (t: string, o: { minInterval: number }) => Promise<void> } };
      if (reg.periodicSync) {
        const st = await (navigator.permissions?.query({ name: 'periodic-background-sync' as PermissionName }).catch(() => null));
        if (!st || st.state === 'granted') { await reg.periodicSync.register('daily-reminder', { minInterval: 60 * 60 * 1000 }); background = true; }
      }
    } catch { /* desteklenmiyor */ }
  }
  return { permission, background };
}

let timer: number | undefined;
/** Uygulama açıkken (arka planda sekme olarak bile) hatırlatma saatini bekler. */
export function scheduleInPage() {
  clearTimeout(timer);
  const r = getState().settings.reminder;
  if (!r.on) return;
  const [h, m] = r.time.split(':').map(Number);
  const now = new Date(); const at = new Date(now); at.setHours(h, m, 0, 0);
  if (at.getTime() <= now.getTime()) at.setDate(at.getDate() + 1);
  timer = window.setTimeout(() => { fireNow(); scheduleInPage(); }, Math.min(at.getTime() - now.getTime(), 2 ** 31 - 1));
}
const LAST = 'pev-reminder-last-page';
async function fireNow() {
  const s = getState(); const today = dayKey();
  if (!s.settings.reminder.on || (s.days[today]?.newWords ?? 0) >= s.settings.dailyGoal) return;
  if (localStorageGet(LAST) === today) return;
  localStorageSet(LAST, today);
  if (notifySupported && Notification.permission === 'granted' && document.visibilityState === 'hidden') {
    const reg = await navigator.serviceWorker.ready;
    reg.active?.postMessage('pev-check-reminder');
  }
}
function localStorageGet(k: string) { try { return localStorage.getItem(k); } catch { return null; } }
function localStorageSet(k: string, v: string) { try { localStorage.setItem(k, v); } catch { /* yok */ } }

/** Hatırlatma saati geçti ve bugünkü hedef bitmedi mi? (Ana sayfada uyarı için) */
export function reminderDue(): boolean {
  const s = getState(); const r = s.settings.reminder;
  if (!r.on) return false;
  const [h, m] = r.time.split(':').map(Number); const now = new Date();
  return now.getHours() * 60 + now.getMinutes() >= h * 60 + m && (s.days[dayKey()]?.newWords ?? 0) < s.settings.dailyGoal;
}

/** Her gün aynı saatte alarmlı tekrar eden takvim etkinliği (.ics). iPhone dahil her yerde çevrimdışı çalışır. */
export function downloadIcs(time: string) {
  const [h, m] = time.split(':');
  const d = new Date(); const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
  const url = location.href.split('#')[0];
  const ics = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Personal English Vocabulary//TR', 'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT', `UID:pev-daily-${ymd}@kelimelerim`, `DTSTAMP:${stamp}`,
    `DTSTART:${ymd}T${h}${m}00`, `DTEND:${ymd}T${h}${String(Math.min(59, Number(m) + 10)).padStart(2, '0')}00`,
    'RRULE:FREQ=DAILY', 'SUMMARY:İngilizce kelime zamanı', `DESCRIPTION:Bugünkü kelimelerini çalış: ${url}`, `URL:${url}`,
    'BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:İngilizce kelime zamanı', 'TRIGGER:PT0M', 'END:VALARM',
    'END:VEVENT', 'END:VCALENDAR',
  ].join('\r\n');
  const blob = new Blob([ics], { type: 'text/calendar' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'kelime-hatirlatici.ics';
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
