import { mdiDownload, mdiUpload, mdiDeleteOutline } from '@mdi/js';
import { useEffect, useRef, useState } from 'react';
import { Confirm, Icon, Sheet } from '../components/ui';
import { BUILTIN, registerCustomWords, WORDS } from '../lib/data';
import { downloadIcs, enableReminder, isIOS, notifySupported, scheduleInPage } from '../lib/reminder';
import { getEnglishVoices, onVoicesChanged, speak, speechSupported } from '../lib/speech';
import { t, type Lang } from '../lib/i18n';
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
    if (r.permission === 'unsupported') setRemMsg(t('Bu tarayıcı bildirim desteklemiyor. Aşağıdaki takvim hatırlatıcısını kullan.'));
    else if (r.permission === 'denied') setRemMsg(t('Bildirim izni verilmedi. Tarayıcı ayarlarından izin verebilir ya da takvim hatırlatıcısını kullanabilirsin.'));
    else if (r.background) setRemMsg(t('Bildirim açık. Uygulama kapalıyken de hatırlatma gelebilir; zamanı tarayıcı belirlediği için birkaç dakika ile birkaç saat gecikebilir.'));
    else setRemMsg(isIOS ? t('iPhone\'da uygulama kapalıyken zamanlanmış bildirim desteklenmiyor. Kesin hatırlatma için takvim hatırlatıcısını ekle.') : t('Bildirim yalnızca uygulama açıkken (arka planda bile olsa) gelir. Kapalıyken de hatırlatma istiyorsan takvim hatırlatıcısını ekle.'));
  }
  const file = useRef<HTMLInputElement>(null);

  async function exportJson() {
    const data = { app: 'personal-english-vocabulary', format: 1, exportedAt: new Date().toISOString(), state: getState() };
    const text = JSON.stringify(data, null, 1);
    const name = `kelime-yedek-${new Date().toISOString().slice(0, 10)}.json`;
    const blob = new Blob([text], { type: 'application/json' });
    try {
      const f = new File([blob], name, { type: 'application/json' });
      if (navigator.canShare?.({ files: [f] }) && /iPhone|iPad|Android/i.test(navigator.userAgent)) { await navigator.share({ files: [f], title: name }); setMsg(t('Yedek paylaşıldı. Dosyayı güvenli bir yere kaydet.')); return; }
    } catch (e) { if ((e as Error).name === 'AbortError') return; }
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    setMsg(t('Yedek indirildi: {f}', { f: name }));
  }
  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; e.target.value = '';
    if (!f) return;
    try {
      const j = JSON.parse(await f.text());
      if (j?.app !== 'personal-english-vocabulary' || !j.state) throw new Error(t('Bu dosya bu uygulamanın yedeği değil.'));
      setPending(normalizeState(j.state));
    } catch (err) { setMsg(t('Yedek okunamadı: {e}', { e: (err as Error).message })); }
  }

  return (
    <Sheet open={open} onClose={onClose} title={t('Ayarlar')}>
      <div className="settings">
        <h3>{t('Dil')} / Language</h3>
        <div className="seg" role="radiogroup" aria-label="Dil / Language">{([['tr', 'Türkçe'], ['en', 'English']] as [Lang, string][]).map(([l, name]) => <button key={l} lang={l} role="radio" aria-checked={st.lang === l} className={st.lang === l ? 'on' : ''} onClick={() => setSettings({ lang: l })}>{name}</button>)}</div>
        <p className="muted small">{t('Menüler ve düğmeler seçtiğin dilde görünür. Kelimeler her zaman İngilizce, anlamları Türkçe kalır.')}</p>

        <h3>{t('Görünüm')}</h3>
        <div className="seg" role="radiogroup" aria-label={t('Tema')}>{(['system', 'light', 'dark'] as const).map(th => <button key={th} role="radio" aria-checked={st.theme === th} className={st.theme === th ? 'on' : ''} onClick={() => setSettings({ theme: th })}>{t({ system: 'Sistem', light: 'Açık', dark: 'Koyu' }[th])}</button>)}</div>

        <h3>{t('Öğrenme')}</h3>
        <label className="field">{t('Günlük yeni kelime hedefi')}
          <select value={st.dailyGoal} onChange={e => setSettings({ dailyGoal: Number(e.target.value) })}>{[5, 10, 15, 20].map(n => <option key={n} value={n}>{t('{n} kelime', { n })}{n === 10 ? t(' (önerilen)') : ''}</option>)}</select>
        </label>
        <label className="field">{t('Yeni kelime seviyesi')}
          <select value={st.levelPref} onChange={e => setSettings({ levelPref: e.target.value as AppState['settings']['levelPref'] })}>
            <option value="A2">{t('Önce A2, sonra A1 eksikleri, sonra B1 ve B2')}</option>
            <option value="A1">{t('Önce A1 temelleri')}</option>
            <option value="B1">{t("B1'e hazırlık (önce B1)")}</option>
            <option value="B2">{t("B2'ye hazırlık (önce B2)")}</option>
            <option value="mixed">{t('Karışık')}</option>
          </select>
        </label>
        <p className="muted small">{t('Sözlükte {a} A1, {b} A2, {c} B1, {d} B2 kelime var', { a: BUILTIN.filter(w => w.level === 'A1').length, b: BUILTIN.filter(w => w.level === 'A2').length, c: BUILTIN.filter(w => w.level === 'B1').length, d: BUILTIN.filter(w => w.level === 'B2').length })}{s.custom.length ? t(', ayrıca {n} kendi kelimen', { n: s.custom.length }) : ''}.</p>

        <h3>{t('Günlük hatırlatma')}</h3>
        <label className="toggle"><input type="checkbox" checked={st.reminder.on} onChange={e => toggleReminder(e.target.checked)} /> {t('Her gün hatırlat (hedef bitmediyse)')}</label>
        <label className="field">{t('Saat')}
          <input type="time" value={st.reminder.time} onChange={e => { if (e.target.value) { setSettings({ reminder: { ...st.reminder, time: e.target.value } }); setTimeout(scheduleInPage, 0); } }} />
        </label>
        {remMsg && <p className="note">{remMsg}</p>}
        <button className="btn" onClick={() => downloadIcs(st.reminder.time)}>{t('Takvime hatırlatıcı ekle (.ics)')}</button>
        <p className="muted small">{t("En güvenilir yol takvim hatırlatıcısıdır: telefonun takviminde her gün {h}'da alarm çalar, internet gerekmez (iPhone dahil).", { h: st.reminder.time })} {notifySupported ? t('Uygulama içi bildirim tarayıcıya bağlıdır.') : ''} {t('Hatırlatma saati geçtiğinde ana sayfada da uyarı görünür.')}</p>

        <h3>{t('Sesli telaffuz')}</h3>
        {speechSupported ? <>
          <label className="field">{t('Konuşma hızı: {r}x', { r: st.rate.toFixed(2) })}
            <input type="range" min={0.5} max={1.3} step={0.05} value={st.rate} onChange={e => setSettings({ rate: Number(e.target.value) })} />
          </label>
          <label className="field">{t('Ses')}
            <select value={st.voice ?? ''} onChange={e => setSettings({ voice: e.target.value || undefined })}>
              <option value="">{t('Otomatik (tercihen en-US)')}</option>
              {voices.map(v => <option key={v.voiceURI} value={v.voiceURI}>{v.name} ({v.lang})</option>)}
            </select>
          </label>
          <label className="toggle"><input type="checkbox" checked={st.autoplay} onChange={e => setSettings({ autoplay: e.target.checked })} /> {t('Kart açılınca kelimeyi otomatik seslendir')}</label>
          <button className="btn" onClick={() => speak('I eat an apple every morning.', st.rate, st.voice)}>{t('Sesi dene')}</button>
          {voices.length === 0 && <p className="muted small">{t('İngilizce ses bulunamadı. Telefon ayarlarından (Metin okuma / Konuşulan içerik) İngilizce sesi indirebilirsin.')}</p>}
        </> : <p className="note">{t('Bu tarayıcı sesli okumayı desteklemiyor. Kartlardaki okunuş ve IPA yazımını kullanabilirsin; Chrome (Android) veya Safari (iPhone) önerilir.')}</p>}

        <h3>{t('Yedekleme')}</h3>
        <p className="muted small">{t('Tüm ilerlemen yalnızca bu cihazda saklanır; hiçbir yere gönderilmez. Düzenli yedek alman önerilir.')}</p>
        <div className="row gap wrap">
          <button className="btn" onClick={exportJson}><Icon path={mdiDownload} size={20} /> {t('JSON olarak dışa aktar')}</button>
          <button className="btn" onClick={() => file.current?.click()}><Icon path={mdiUpload} size={20} /> {t('Yedeği içe aktar')}</button>
          <input ref={file} type="file" accept="application/json,.json" hidden onChange={onFile} />
        </div>
        {msg && <p className="note" role="status">{msg}</p>}

        <h3>{t('Veriler')}</h3>
        <button className="btn danger" onClick={() => setConfirmReset(true)}><Icon path={mdiDeleteOutline} size={20} /> {t('Tüm ilerlemeyi sıfırla')}</button>

        <h3>{t('Hakkında')}</h3>
        <p className="muted small">Personal English Vocabulary · {t('{n} kelime', { n: WORDS.length })} · {t("Kişisel kullanım için, üyelik ve sunucu yok. Kelime görselleri uygulamaya gömülü SVG'lerdir; ayrıntı için")} <a href="./ikon-lisanslari.txt" target="_blank" rel="noreferrer">{t('ikon lisansları')}</a>.</p>
        <p className="muted small">{t('Görsel kaynakları:')} Material Design Icons (Pictogrammers, Apache 2.0), Material Symbols (Google, Apache 2.0), game-icons.net (Lorc, Delapouite {t('ve diğer yazarlar')}, CC BY 3.0), Healthicons (MIT), Phosphor Icons (MIT), Font Awesome Free (Fonticons, CC BY 4.0), Fluent UI System Icons (Microsoft, MIT), MingCute (Apache 2.0). {t('Renk, sayı, edat ve karşıtlık şemaları bu uygulama için çizildi.')}</p>
      </div>
      <Confirm open={!!pending} title={t('Yedek geri yüklensin mi?')} text={pending ? t('Yedekte {n} kelimelik ilerleme var. Mevcut ilerlemen bu yedekle değiştirilecek.', { n: Object.keys(pending.progress).length }) : ''} confirmText={t('Geri yükle')}
        onCancel={() => { registerCustomWords(getState().custom); setPending(null); }} onConfirm={() => { replaceState(pending!); setPending(null); setMsg(t('Yedek başarıyla geri yüklendi.')); }} />
      <Confirm open={confirmReset} danger title={t('Her şey silinsin mi?')} text={t('Öğrenme geçmişin, favorilerin ve istatistiklerin kalıcı olarak silinecek. Önce yedek almanı öneririz.')} confirmText={t('Evet, sıfırla')}
        onCancel={() => setConfirmReset(false)} onConfirm={() => { resetAll(); setConfirmReset(false); setMsg(t('İlerleme sıfırlandı.')); }} />
    </Sheet>
  );
}
