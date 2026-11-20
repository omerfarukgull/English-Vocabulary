import { mdiDownload, mdiUpload, mdiDeleteOutline } from '@mdi/js';
import { useEffect, useRef, useState } from 'react';
import { Confirm, Icon, Sheet } from '../components/ui';
import { BUILTIN, registerCustomWords, WORDS } from '../lib/data';
import { downloadIcs, enableReminder, isIOS, notifySupported, scheduleInPage } from '../lib/reminder';
import { getEnglishVoices, onVoicesChanged, speak, speechSupported } from '../lib/speech';
import { getState, normalizeState, replaceState, resetAll, setSettings, useApp, type AppState } from '../lib/store';

export default function Settings({ open, onClose }: { open: boolean; onClose: () => void }) {
  const s = useApp();
  const st = s.settings;
  const [voices, setVoices] = useState(getEnglishVoices());
  useEffect(() => onVoicesChanged(() => setVoices([...getEnglishVoices()])), []);
  const [msg, setMsg] = useState('');
  const [pending, setPending] = useState<AppState | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [remMsg, setRemMsg] = useState('');
  async function toggleReminder(on: boolean) {
    setSettings({ reminder: { ...st.reminder, on } });
    setTimeout(scheduleInPage, 0);
    if (!on) { setRemMsg(''); return; }
    const r = await enableReminder();
    if (r.permission === 'unsupported') setRemMsg('Bu tarayıcı bildirim desteklemiyor. Aşağıdaki takvim hatırlatıcısını kullan.');
    else if (r.permission === 'denied') setRemMsg('Bildirim izni verilmedi. Tarayıcı ayarlarından izin verebilir ya da takvim hatırlatıcısını kullanabilirsin.');
    else if (r.background) setRemMsg('Bildirim açık. Uygulama kapalıyken de hatırlatma gelebilir; zamanı tarayıcı belirlediği için birkaç dakika ile birkaç saat gecikebilir.');
    else setRemMsg(isIOS ? 'iPhone\'da uygulama kapalıyken zamanlanmış bildirim desteklenmiyor. Kesin hatırlatma için takvim hatırlatıcısını ekle.' : 'Bildirim yalnızca uygulama açıkken (arka planda bile olsa) gelir. Kapalıyken de hatırlatma istiyorsan takvim hatırlatıcısını ekle.');
  }
  const file = useRef<HTMLInputElement>(null);

  async function exportJson() {
    const data = { app: 'personal-english-vocabulary', format: 1, exportedAt: new Date().toISOString(), state: getState() };
    const text = JSON.stringify(data, null, 1);
    const name = `kelime-yedek-${new Date().toISOString().slice(0, 10)}.json`;
    const blob = new Blob([text], { type: 'application/json' });
    try {
      const f = new File([blob], name, { type: 'application/json' });
      if (navigator.canShare?.({ files: [f] }) && /iPhone|iPad|Android/i.test(navigator.userAgent)) { await navigator.share({ files: [f], title: name }); setMsg('Yedek paylaşıldı. Dosyayı güvenli bir yere kaydet.'); return; }
    } catch (e) { if ((e as Error).name === 'AbortError') return; }
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    setMsg(`Yedek indirildi: ${name}`);
  }
  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; e.target.value = '';
    if (!f) return;
    try {
      const j = JSON.parse(await f.text());
      if (j?.app !== 'personal-english-vocabulary' || !j.state) throw new Error('Bu dosya bu uygulamanın yedeği değil.');
      setPending(normalizeState(j.state));
    } catch (err) { setMsg(`Yedek okunamadı: ${(err as Error).message}`); }
  }

  return (
    <Sheet open={open} onClose={onClose} title="Ayarlar">
      <div className="settings">
        <h3>Görünüm</h3>
        <div className="seg" role="radiogroup" aria-label="Tema">{(['system', 'light', 'dark'] as const).map(t => <button key={t} role="radio" aria-checked={st.theme === t} className={st.theme === t ? 'on' : ''} onClick={() => setSettings({ theme: t })}>{{ system: 'Sistem', light: 'Açık', dark: 'Koyu' }[t]}</button>)}</div>

        <h3>Öğrenme</h3>
        <label className="field">Günlük yeni kelime hedefi
          <select value={st.dailyGoal} onChange={e => setSettings({ dailyGoal: Number(e.target.value) })}>{[5, 10, 15, 20].map(n => <option key={n} value={n}>{n} kelime{n === 10 ? ' (önerilen)' : ''}</option>)}</select>
        </label>
        <label className="field">Yeni kelime seviyesi
          <select value={st.levelPref} onChange={e => setSettings({ levelPref: e.target.value as AppState['settings']['levelPref'] })}>
            <option value="A2">Önce A2, sonra A1 eksikleri, sonra B1</option>
            <option value="A1">Önce A1 temelleri</option>
            <option value="B1">B1'e hazırlık (önce B1)</option>
            <option value="mixed">Karışık</option>
          </select>
        </label>
        <p className="muted small">Sözlükte {BUILTIN.filter(w => w.level === 'A1').length} A1, {BUILTIN.filter(w => w.level === 'A2').length} A2, {BUILTIN.filter(w => w.level === 'B1').length} B1 kelime var{s.custom.length ? `, ayrıca ${s.custom.length} kendi kelimen` : ''}.</p>

        <h3>Günlük hatırlatma</h3>
        <label className="toggle"><input type="checkbox" checked={st.reminder.on} onChange={e => toggleReminder(e.target.checked)} /> Her gün hatırlat (hedef bitmediyse)</label>
        <label className="field">Saat
          <input type="time" value={st.reminder.time} onChange={e => { if (e.target.value) { setSettings({ reminder: { ...st.reminder, time: e.target.value } }); setTimeout(scheduleInPage, 0); } }} />
        </label>
        {remMsg && <p className="note">{remMsg}</p>}
        <button className="btn" onClick={() => downloadIcs(st.reminder.time)}>Takvime günlük hatırlatıcı ekle (.ics)</button>
        <p className="muted small">En güvenilir yol takvim hatırlatıcısıdır: telefonun takviminde her gün {st.reminder.time}'da alarm çalar, internet gerekmez (iPhone dahil). {notifySupported ? 'Uygulama içi bildirim tarayıcıya bağlıdır.' : ''} Hatırlatma saati geçtiğinde ana sayfada da uyarı görünür.</p>

        <h3>Sesli telaffuz</h3>
        {speechSupported ? <>
          <label className="field">Konuşma hızı: {st.rate.toFixed(2)}x
            <input type="range" min={0.5} max={1.3} step={0.05} value={st.rate} onChange={e => setSettings({ rate: Number(e.target.value) })} />
          </label>
          <label className="field">Ses
            <select value={st.voice ?? ''} onChange={e => setSettings({ voice: e.target.value || undefined })}>
              <option value="">Otomatik (tercihen en-US)</option>
              {voices.map(v => <option key={v.voiceURI} value={v.voiceURI}>{v.name} ({v.lang})</option>)}
            </select>
          </label>
          <label className="toggle"><input type="checkbox" checked={st.autoplay} onChange={e => setSettings({ autoplay: e.target.checked })} /> Kart açılınca kelimeyi otomatik seslendir</label>
          <button className="btn" onClick={() => speak('I eat an apple every morning.', st.rate, st.voice)}>Sesi dene</button>
          {voices.length === 0 && <p className="muted small">İngilizce ses bulunamadı. Telefon ayarlarından (Metin okuma / Konuşulan içerik) İngilizce sesi indirebilirsin.</p>}
        </> : <p className="note">Bu tarayıcı sesli okumayı desteklemiyor. Kartlardaki okunuş ve IPA yazımını kullanabilirsin; Chrome (Android) veya Safari (iPhone) önerilir.</p>}

        <h3>Yedekleme</h3>
        <p className="muted small">Tüm ilerlemen yalnızca bu cihazda saklanır; hiçbir yere gönderilmez. Düzenli yedek alman önerilir.</p>
        <div className="row gap wrap">
          <button className="btn" onClick={exportJson}><Icon path={mdiDownload} size={20} /> JSON olarak dışa aktar</button>
          <button className="btn" onClick={() => file.current?.click()}><Icon path={mdiUpload} size={20} /> Yedeği içe aktar</button>
          <input ref={file} type="file" accept="application/json,.json" hidden onChange={onFile} />
        </div>
        {msg && <p className="note" role="status">{msg}</p>}

        <h3>Veriler</h3>
        <button className="btn danger" onClick={() => setConfirmReset(true)}><Icon path={mdiDeleteOutline} size={20} /> Tüm ilerlemeyi sıfırla</button>

        <h3>Hakkında</h3>
        <p className="muted small">Personal English Vocabulary · {WORDS.length} kelime · Kişisel kullanım için, üyelik ve sunucu yok. Kelime görselleri uygulamaya gömülü SVG'lerdir; ayrıntı için <a href="./ikon-lisanslari.txt" target="_blank" rel="noreferrer">ikon lisansları</a>.</p>
        <p className="muted small">Görsel kaynakları: Material Design Icons (Pictogrammers, Apache 2.0), Material Symbols (Google, Apache 2.0), game-icons.net (Lorc, Delapouite ve diğer yazarlar, CC BY 3.0), Healthicons (MIT), Phosphor Icons (MIT), Font Awesome Free (Fonticons, CC BY 4.0), Fluent UI System Icons (Microsoft, MIT), MingCute (Apache 2.0). Renk, sayı, edat ve karşıtlık şemaları bu uygulama için çizildi.</p>
      </div>
      <Confirm open={!!pending} title="Yedek geri yüklensin mi?" text={pending ? `Yedekte ${Object.keys(pending.progress).length} kelimelik ilerleme var. Mevcut ilerlemen bu yedekle değiştirilecek.` : ''} confirmText="Geri yükle"
        onCancel={() => { registerCustomWords(getState().custom); setPending(null); }} onConfirm={() => { replaceState(pending!); setPending(null); setMsg('Yedek başarıyla geri yüklendi.'); }} />
      <Confirm open={confirmReset} danger title="Her şey silinsin mi?" text="Öğrenme geçmişin, favorilerin ve istatistiklerin kalıcı olarak silinecek. Önce yedek almanı öneririz." confirmText="Evet, sıfırla"
        onCancel={() => setConfirmReset(false)} onConfirm={() => { resetAll(); setConfirmReset(false); setMsg('İlerleme sıfırlandı.'); }} />
    </Sheet>
  );
}
