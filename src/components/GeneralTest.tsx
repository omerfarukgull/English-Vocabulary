import { mdiClipboardTextMultipleOutline, mdiAlertCircleOutline } from '@mdi/js';
import { formatDayLong } from '../lib/date';
import { t } from '../lib/i18n';
import { GENERAL_MIN_WORDS, GENERAL_SIZE, generalStatus, useApp } from '../lib/store';
import { Icon } from './ui';

/** Genel test kartı: şimdiye kadar öğrenilen kelimelerden test. Haftada bir zorunlu, istenince her zaman. */
export default function GeneralTestCard({ onStart }: { onStart: () => void }) {
  const s = useApp();
  const seen = Object.keys(s.progress).length;
  const g = generalStatus(s);
  const q = GENERAL_SIZE;
  return (
    <section className={`card general-card ${g.due ? 'due' : ''}`}>
      <h2><Icon path={mdiClipboardTextMultipleOutline} size={22} /> {t('Genel test')}</h2>
      {g.due && <div className="notice warn" role="status"><Icon path={mdiAlertCircleOutline} size={20} /><div><b>{t('Bu haftanın genel testi seni bekliyor.')}</b><span className="small">{g.locked ? t('Test çözülene kadar yeni kelime öğrenme kilitli.') : t('Haftada bir zorunlu. Yarına kadar çözmezsen yeni kelime öğrenme test çözülene kadar kilitlenir.')}</span></div></div>}
      <p className="muted small">{seen
        ? t('Şimdiye kadar öğrendiğin {n} kelimeden {q} soruluk karışık test. Haftada bir zorunlu; istediğin zaman da çözebilirsin.', { n: seen, q })
        : t('Kelime öğrendikçe, şimdiye kadar öğrendiğin tüm kelimelerden test çözebileceksin.')}</p>
      {g.last && <p className="small general-last">{t('Son genel test: {d} · {c}/{n} doğru (%{p})', { d: formatDayLong(g.last.date), c: g.last.correct, n: g.last.total, p: g.last.total ? Math.round(g.last.correct / g.last.total * 100) : 0 })}</p>}
      {!g.due && seen > 0 && (g.enough
        ? <p className="muted small">{t('Sonraki zorunlu genel test: {d}', { d: formatDayLong(g.next!) })}</p>
        : <p className="muted small">{t('Haftalık zorunlu test, {m} kelime öğrendikten sonra başlar.', { m: GENERAL_MIN_WORDS })}</p>)}
      <button className={`btn block ${g.due ? 'primary' : ''}`} onClick={onStart} disabled={seen === 0}>{t('Genel teste başla')}</button>
    </section>
  );
}
