import { mdiRepeat, mdiAlertCircleOutline, mdiStarOutline, mdiShuffleVariant, mdiHistory } from '@mdi/js';
import { useState } from 'react';
import { FocusPicker, Icon } from '../components/ui';
import { catName, WORD_BY_ID } from '../lib/data';
import { t } from '../lib/i18n';
import { MODE_LABELS, shuffle } from '../lib/quiz';
import { speechSupported } from '../lib/speech';
import type { QuizMode } from '../lib/srs';
import { dueIds, useApp } from '../lib/store';
import type { SessionConfig } from './Quiz';
import GeneralTestCard from '../components/GeneralTest';

const MODES: (QuizMode | 'mixed')[] = ['mixed', 'img-write', 'img-choice', 'en-tr', 'tr-en', 'listen'];
const MODE_DESC: Record<QuizMode | 'mixed', string> = {
  mixed: 'Her soruda farklı yöntem (önerilen)',
  'img-write': 'Görseli gör, İngilizcesini yaz',
  'img-choice': 'Görseli gör, 4 seçenekten bul',
  'en-tr': 'İngilizce kelime, Türkçe anlamı seç',
  'tr-en': 'Türkçe kelime, İngilizcesini yaz',
  listen: 'Telaffuzu dinle, kelimeyi bul',
};
const SESSION = 20;

export default function Review({ start, startGeneral }: { start: (c: SessionConfig) => void; startGeneral: () => void }) {
  const s = useApp();
  const [mode, setMode] = useState<QuizMode | 'mixed'>('mixed');
  const [cat, setCat] = useState(s.settings.focusCat);
  const inCat = (id: string) => !cat || WORD_BY_ID[id]?.cat === cat;
  const due = dueIds(s).filter(inCat);
  const allSeen = Object.keys(s.progress);
  const seen = allSeen.filter(inCat);
  const hard = seen.filter(id => s.progress[id].status === 'hard');
  const favs = s.favorites.filter(id => s.progress[id]);
  const oldest = [...seen].sort((a, b) => s.progress[a].lastSeen - s.progress[b].lastSeen);
  const needImg = mode === 'img-write' || mode === 'img-choice';
  const filt = (ids: string[]) => needImg ? ids.filter(id => WORD_BY_ID[id].img) : ids;
  const catSuffix = cat ? ` · ${catName(cat)}` : '';
  const run = (ids: string[], title: string) => { const list = filt(ids).slice(0, SESSION); if (list.length) start({ ids: list, mode, title: t(title) + catSuffix }); };

  if (allSeen.length === 0) return <div className="screen"><h1>{t('Tekrar')}</h1><div className="card empty">{t('Henüz tekrar edilecek kelime yok. Önce "Öğren" sekmesinden birkaç kelime öğren; burada seni akıllı tekrarlar bekleyecek.')}</div></div>;

  return (
    <div className="screen">
      <h1>{t('Tekrar')}</h1>
      <section className="card">
        <FocusPicker value={cat} onChange={setCat} label={t('Hangi kategoriden?')} countMode="seen" />
        {cat && seen.length === 0 && <p className="muted small" style={{ margin: '8px 0 0' }}>{t('Bu kategoriden henüz kelime öğrenmedin. Önce Öğren ekranından bu kategoriyi seçip birkaç kelime öğren.')}</p>}
      </section>
      <section className="card hero">
        <div className="muted">{t('Akıllı tekrar')}</div>
        <div className="hero-num"><b>{due.length}</b> {t('kelime tekrar bekliyor')}</div>
        <p className="muted small">{t('Yanlış bildiğin kelimeler daha sık, iyi bildiklerin daha seyrek sorulur. Bir kelime farklı test türlerinde art arda doğru bilinince "Öğrenildi" olur.')}</p>
        {due.length > 0
          ? <button className="btn primary block" onClick={() => run(due, 'Akıllı tekrar')} disabled={!filt(due).length}><Icon path={mdiRepeat} size={20} /> {t('Tekrara başla ({n})', { n: Math.min(SESSION, filt(due).length) })}</button>
          : <p className="success-msg">{t('Şu an bekleyen tekrar yok. İstersen aşağıdan serbest pratik yapabilirsin.')}</p>}
      </section>

      <GeneralTestCard onStart={startGeneral} />

      <section className="card">
        <h2>{t('Test türü')}</h2>
        <div className="mode-list">
          {MODES.filter(m => m !== 'listen' || speechSupported).map(m => (
            <label key={m} className={`mode-item ${mode === m ? 'on' : ''}`}>
              <input type="radio" name="mode" checked={mode === m} onChange={() => setMode(m)} />
              <div><b>{m === 'mixed' ? t('Karışık tekrar') : t(MODE_LABELS[m])}</b><span className="muted small">{t(MODE_DESC[m])}</span></div>
            </label>
          ))}
        </div>
        {needImg && <p className="muted small">{t('Bu türde yalnızca görseli olan kelimeler sorulur.')}</p>}
      </section>

      <section className="card">
        <h2>{t('Serbest pratik')}</h2>
        <p className="muted small">{t('Tekrar tarihi gelmemiş kelimelerde doğru cevap takvimi değiştirmez; yanlış cevap kelimeyi öne alır.')}</p>
        <div className="list-btns">
          <button className="btn" onClick={() => run(shuffle(seen), 'Karışık pratik')} disabled={!filt(seen).length}><Icon path={mdiShuffleVariant} size={20} /> {t('Rastgele ({n})', { n: Math.min(SESSION, filt(seen).length) })}</button>
          <button className="btn" onClick={() => run(oldest, 'Uzun süredir görmediklerin')} disabled={!filt(oldest).length}><Icon path={mdiHistory} size={20} /> {t('Uzun süredir görmediklerim')}</button>
          <button className="btn" onClick={() => run(shuffle(hard), 'Zorlandıklarım')} disabled={!filt(hard).length}><Icon path={mdiAlertCircleOutline} size={20} /> {t('Zorlandıklarım ({n})', { n: filt(hard).length })}</button>
          <button className="btn" onClick={() => run(shuffle(favs), 'Favoriler')} disabled={!filt(favs).length}><Icon path={mdiStarOutline} size={20} /> {t('Favorilerim ({n})', { n: filt(favs).length })}</button>
        </div>
      </section>
    </div>
  );
}
