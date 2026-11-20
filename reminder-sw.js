/* Günlük hatırlatma: Service Worker tarafı.
 * Sunucu yok; bu yüzden yalnızca tarayıcının "periodic background sync" özelliği olan yerlerde
 * (Android'de ana ekrana yüklenmiş Chrome/Edge) arka planda çalışır. Tarayıcı bu olayı en fazla
 * birkaç saatte bir ve kendi seçtiği zamanda tetikler; tam dakikasında garanti değildir. */
const KEY = 'pev-state-v1', LAST = 'pev-reminder-last';
function idb(mode, fn) {
  return new Promise((res, rej) => {
    const r = indexedDB.open('keyval-store');
    r.onupgradeneeded = () => r.result.createObjectStore('keyval');
    r.onerror = () => rej(r.error);
    r.onsuccess = () => {
      const db = r.result;
      if (!db.objectStoreNames.contains('keyval')) { db.close(); res(undefined); return; }
      const tx = db.transaction('keyval', mode); const st = tx.objectStore('keyval');
      const q = fn(st); tx.oncomplete = () => { db.close(); res(q && q.result); }; tx.onerror = () => rej(tx.error);
    };
  });
}
const dayKey = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
async function maybeRemind() {
  const s = await idb('readonly', st => st.get(KEY));
  const r = s && s.settings && s.settings.reminder;
  if (!r || !r.on) return;
  const now = new Date(); const today = dayKey(now);
  const [h, m] = String(r.time || '20:00').split(':').map(Number);
  if (now.getHours() * 60 + now.getMinutes() < h * 60 + m) return;
  if ((await idb('readonly', st => st.get(LAST))) === today) return;
  const day = (s.days && s.days[today]) || { newWords: 0, reviews: 0 };
  const goal = s.settings.dailyGoal || 10;
  if (day.newWords >= goal) return; // bugünkü hedef tamam
  await idb('readwrite', st => st.put(today, LAST));
  const left = goal - day.newWords;
  await self.registration.showNotification('Kelime zamanı', {
    body: day.newWords ? `Bugün ${left} yeni kelime kaldı. Birkaç dakika yeter.` : `Bugünkü ${goal} kelimen seni bekliyor.`,
    icon: 'pwa-192.png', badge: 'pwa-192.png', tag: 'daily-reminder', lang: 'tr',
  });
}
self.addEventListener('periodicsync', e => { if (e.tag === 'daily-reminder') e.waitUntil(maybeRemind()); });
self.addEventListener('message', e => { if (e.data === 'pev-check-reminder') e.waitUntil(maybeRemind()); });
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
    for (const c of list) if ('focus' in c) return c.focus();
    return self.clients.openWindow('./#learn');
  }));
});
