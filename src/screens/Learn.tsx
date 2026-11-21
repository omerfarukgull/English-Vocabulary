import { mdiArrowRight, mdiArrowLeft, mdiPartyPopper } from '@mdi/js';
import { useEffect, useState, type ReactNode } from 'react';
import DayList from '../components/DayList';
import { FocusPicker, Icon, ProgressBar, WordCard } from '../components/ui';
import { catName, WORD_BY_ID } from '../lib/data';
import { t } from '../lib/i18n';
import { ensurePlan, extendPlan, markSeen, setFocusCat, todayNewCount, unseenOrdered, useApp, type LearnedDay } from '../lib/store';

export type LearnView = 'today' | 'days';
export default function Learn({ startTodayTest, view, setView, onReplay, onDayTest }: { startTodayTest: () => void; view: LearnView; setView: (v: LearnView) => void; onReplay: (d: LearnedDay) => void; onDayTest: (d: LearnedDay) => void }) {
  const seg = (
    <div className="seg learn-seg" role="tablist">
      <button role="tab" aria-selected={view === 'today'} className={view === 'today' ? 'on' : ''} onClick={() => setView('today')}>{t('Bugün')}</button>
      <button role="tab" aria-selected={view === 'days'} className={view === 'days' ? 'on' : ''} onClick={() => setView('days')}>{t('Günlerim')}</button>
    </div>
  );
  if (view === 'days') return <div className="screen"><h1>{t('Öğren')}</h1>{seg}<DayList onReplay={onReplay} onTest={onDayTest} /></div>;
  return <LearnToday startTodayTest={startTodayTest} seg={seg} />;
}

function LearnToday({ startTodayTest, seg }: { startTodayTest: () => void; seg: ReactNode }) {
  const s = useApp();
  useEffect(() => { ensurePlan(); }, []);
  const ids = s.plan.ids;
  const firstUnseen = ids.findIndex(id => !s.progress[id]);
  const [back, setBack] = useState<number | null>(null); // geri gidilen kart (görülmüş)
  const learnedToday = todayNewCount(s);
  const goal = s.settings.dailyGoal;
  const remainingInBank = unseenOrdered(s).length;

  if (firstUnseen === -1 && back === null) {
    const fc = s.settings.focusCat;
    const picker = <div className="card"><FocusPicker value={fc} onChange={setFocusCat} /></div>;
    if (remainingInBank === 0 && fc && (ids.length === 0 || learnedToday < goal)) {
      return <div className="screen"><h1>{t('Öğren')}</h1>{seg}{picker}<div className="card empty">{t('"{c}" kategorisindeki tüm kelimeleri gördün! Tekrar ekranında bu kategoriyi pekiştirebilir ya da yukarıdan başka bir kategori seçebilirsin.', { c: catName(fc) })}</div></div>;
    }
    if (ids.length === 0 && remainingInBank === 0 && learnedToday === 0) {
      return <div className="screen"><h1>{t('Öğren')}</h1>{seg}<div className="card empty">{t('Tüm kelimeleri gördün! Artık tekrar ve testlerle pekiştirebilirsin.')}</div></div>;
    }
    return (
      <div className="screen">
        <h1>{t('Öğren')}</h1>{seg}
        <div className="card celebrate">
          <Icon path={mdiPartyPopper} size={56} />
          <h2>{learnedToday >= goal ? t('Harika iş!') : t('Plan tamamlandı')}</h2>
          <p>{learnedToday >= goal ? t('Bugün {n} yeni kelime öğrendin ve {g} kelimelik hedefini tamamladın.', { n: learnedToday, g: goal }) : t('Bugün {n} yeni kelime öğrendin.', { n: learnedToday })}</p>
          <p className="muted">{t('Kalıcı olması için şimdi kısa bir testle pekiştir.')}</p>
          <button className="btn primary block" onClick={startTodayTest}>{t('Bugünün testini çöz')}</button>
          {remainingInBank > 0 && <button className="btn block" onClick={() => extendPlan(5)}>{t('5 kelime daha öğren')}{fc ? ` (${catName(fc)})` : ''}</button>}
        </div>
        {picker}
      </div>
    );
  }

  const idx = back ?? firstUnseen;
  const word = WORD_BY_ID[ids[idx]];
  const position = idx + 1;
  const next = () => {
    if (back !== null) { setBack(back + 1 < (firstUnseen === -1 ? ids.length : firstUnseen) ? back + 1 : null); return; }
    markSeen(word.id);
  };
  const prev = () => { const p = idx - 1; if (p >= 0) setBack(p); };

  return (
    <div className="screen learn">
      <div className="row between"><h1>{t('Öğren')}</h1><span className="muted">{position} / {ids.length}</span></div>
      {seg}
      <ProgressBar value={(firstUnseen === -1 ? ids.length : firstUnseen) / Math.max(1, ids.length)} label={t('Bugünkü kelimeler')} />
      {s.settings.focusCat && <div className="muted small">{t('Kategori: {c}', { c: catName(s.settings.focusCat) })}</div>}
      <div className="fade" key={word.id}><WordCard word={word} autoplay /></div>
      <div className="row gap bottom-actions">
        <button className="btn" onClick={prev} disabled={idx === 0} aria-label={t('Önceki kelime')}><Icon path={mdiArrowLeft} size={20} /></button>
        <button className="btn primary grow" onClick={next}>{back !== null ? t('İleri') : position >= ids.length ? t('Bitir') : t('Sonraki kelime')} <Icon path={mdiArrowRight} size={20} /></button>
      </div>
    </div>
  );
}
