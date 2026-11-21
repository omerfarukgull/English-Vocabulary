import { mdiChevronLeft, mdiChevronRight, mdiPlayCircleOutline, mdiClipboardCheckOutline } from '@mdi/js';
import { useState } from 'react';
import { capEn, WORD_BY_ID } from '../lib/data';
import { dayKey, formatDayLong } from '../lib/date';
import { learnedDays, useApp, type LearnedDay } from '../lib/store';
import { Icon } from './ui';
import { t } from '../lib/i18n';

const PER_PAGE = 7;
let lastPage = 0; // bir güne girip geri dönünce aynı sayfada kal

/** Günlere göre öğrenilen kelimeler: sayfalı liste, en yeni gün başta. */
export default function DayList({ onReplay, onTest }: { onReplay: (d: LearnedDay) => void; onTest: (d: LearnedDay) => void }) {
  const s = useApp();
  const days = [...learnedDays(s)].reverse();
  const pages = Math.max(1, Math.ceil(days.length / PER_PAGE));
  const [page, setPageState] = useState(lastPage);
  const setPage = (n: number) => { lastPage = n; setPageState(n); };
  const pg = Math.min(page, pages - 1);
  const shown = days.slice(pg * PER_PAGE, pg * PER_PAGE + PER_PAGE);
  const today = dayKey();
  if (days.length === 0) return <div className="card empty">{t('Henüz kelime öğrenmedin. "Bugün" sekmesinden ilk kelimelerini öğrendiğinde günlerin burada listelenecek.')}</div>;
  return (
    <div className="day-list">
      <p className="muted small">{t('Her gün öğrendiğin kelimeler ayrı tutulur. Bir günü açıp kelimeleri öğrenirken olduğu gibi kart kart tekrar edebilirsin; bu, ilerlemeni değiştirmez.')}</p>
      <ul>
        {shown.map(d => (
          <li key={d.date} className="card day-item">
            <div className="row between">
              <div><b>{t('{n}. Gün', { n: d.n })}</b>{d.date === today && <span className="chip small-chip">{t('Bugün')}</span>}<div className="muted small">{formatDayLong(d.date)} · {t('{n} kelime', { n: d.ids.length })}</div></div>
            </div>
            <div className="muted small day-preview">{d.ids.slice(0, 6).map(id => WORD_BY_ID[id] ? capEn(WORD_BY_ID[id].en) : '').filter(Boolean).join(', ')}{d.ids.length > 6 ? ' …' : ''}</div>
            <div className="row gap">
              <button className="btn primary grow small" onClick={() => onReplay(d)}><Icon path={mdiPlayCircleOutline} size={18} /> {t('Tekrar et')}</button>
              <button className="btn grow small" onClick={() => onTest(d)}><Icon path={mdiClipboardCheckOutline} size={18} /> {t('Test ol')}</button>
            </div>
          </li>
        ))}
      </ul>
      {pages > 1 && (
        <div className="row between pager">
          <button className="btn small" onClick={() => setPage(pg - 1)} disabled={pg === 0} aria-label={t('Önceki sayfa')}><Icon path={mdiChevronLeft} size={20} /> {t('Yeni günler')}</button>
          <span className="muted small">{t('Sayfa {a} / {b}', { a: pg + 1, b: pages })}</span>
          <button className="btn small" onClick={() => setPage(pg + 1)} disabled={pg >= pages - 1} aria-label={t('Sonraki sayfa')}>{t('Eski günler')} <Icon path={mdiChevronRight} size={20} /></button>
        </div>
      )}
    </div>
  );
}
