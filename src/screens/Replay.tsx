import { mdiArrowLeft, mdiArrowRight, mdiCheckCircle, mdiClose } from '@mdi/js';
import { useState } from 'react';
import { Icon, ProgressBar, WordCard } from '../components/ui';
import { WORD_BY_ID } from '../lib/data';
import { formatDayLong } from '../lib/date';
import type { LearnedDay } from '../lib/store';
import { t } from '../lib/i18n';

/** Bir günün kelimelerini, öğrenirken olduğu gibi kart kart yeniden göster. İlerlemeyi değiştirmez. */
export default function Replay({ day, onExit, onTest }: { day: LearnedDay; onExit: () => void; onTest: () => void }) {
  const ids = day.ids.filter(id => WORD_BY_ID[id]);
  const [i, setI] = useState(0);
  const done = i >= ids.length;
  const title = t('{n}. Gün kelimeleri', { n: day.n });
  if (done || ids.length === 0) return (
    <div className="screen">
      <h1>{title}</h1>
      <div className="card celebrate">
        <Icon path={mdiCheckCircle} size={56} />
        <h2>{t('Tekrar tamam')}</h2>
        <p>{t('{d} öğrendiğin {n} kelimeyi yeniden gözden geçirdin.', { d: formatDayLong(day.date), n: ids.length })}</p>
        <p className="muted">{t('Kalıcı olması için bu kelimelerle kısa bir test çözebilirsin.')}</p>
        {ids.length > 0 && <button className="btn primary block" onClick={onTest}>{t('Bu günün testini çöz')}</button>}
        <button className="btn block" onClick={() => setI(0)}>{t('Baştan tekrar et')}</button>
        <button className="btn ghost block" onClick={onExit}>{t('Geri dön')}</button>
      </div>
    </div>
  );
  const w = WORD_BY_ID[ids[i]];
  return (
    <div className="screen learn">
      <div className="row between"><h1>{title}</h1><button className="icon-btn" onClick={onExit} aria-label={t('Kapat')}><Icon path={mdiClose} /></button></div>
      <div className="row between muted small"><span>{formatDayLong(day.date)}</span><span>{i + 1} / {ids.length}</span></div>
      <ProgressBar value={(i + 1) / ids.length} label={t('Gün tekrarı')} />
      <div className="fade" key={w.id}><WordCard word={w} autoplay /></div>
      <div className="row gap bottom-actions">
        <button className="btn" onClick={() => setI(Math.max(0, i - 1))} disabled={i === 0} aria-label={t('Önceki kelime')}><Icon path={mdiArrowLeft} size={20} /></button>
        <button className="btn primary grow" onClick={() => setI(i + 1)}>{i + 1 >= ids.length ? t('Bitir') : t('Sonraki kelime')} <Icon path={mdiArrowRight} size={20} /></button>
      </div>
    </div>
  );
}
