import { mdiArrowRight, mdiArrowLeft, mdiPartyPopper } from '@mdi/js';
import { useEffect, useState } from 'react';
import { FocusPicker, Icon, ProgressBar, WordCard } from '../components/ui';
import { CAT_BY_ID, WORD_BY_ID } from '../lib/data';
import { ensurePlan, extendPlan, markSeen, setFocusCat, todayNewCount, unseenOrdered, useApp } from '../lib/store';

export default function Learn({ startTodayTest }: { startTodayTest: () => void }) {
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
      return <div className="screen"><h1>Öğren</h1>{picker}<div className="card empty">"{CAT_BY_ID[fc]?.tr}" kategorisindeki tüm kelimeleri gördün! Tekrar ekranında bu kategoriyi pekiştirebilir ya da yukarıdan başka bir kategori seçebilirsin.</div></div>;
    }
    if (ids.length === 0 && remainingInBank === 0 && learnedToday === 0) {
      return <div className="screen"><h1>Öğren</h1><div className="card empty">Tüm kelimeleri gördün! Artık tekrar ve testlerle pekiştirebilirsin.</div></div>;
    }
    return (
      <div className="screen">
        <h1>Öğren</h1>
        <div className="card celebrate">
          <Icon path={mdiPartyPopper} size={56} />
          <h2>{learnedToday >= goal ? 'Harika iş!' : 'Plan tamamlandı'}</h2>
          <p>Bugün <b>{learnedToday}</b> yeni kelime öğrendin{learnedToday >= goal ? ` ve ${goal} kelimelik hedefini tamamladın.` : '.'}</p>
          <p className="muted">Kalıcı olması için şimdi kısa bir testle pekiştir.</p>
          <button className="btn primary block" onClick={startTodayTest}>Bugünün kelimeleriyle test ol</button>
          {remainingInBank > 0 && <button className="btn block" onClick={() => extendPlan(5)}>5 kelime daha öğren{fc ? ` (${CAT_BY_ID[fc]?.tr})` : ''}</button>}
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
      <div className="row between"><h1>Öğren</h1><span className="muted">{position} / {ids.length}</span></div>
      <ProgressBar value={(firstUnseen === -1 ? ids.length : firstUnseen) / Math.max(1, ids.length)} label="Bugünkü kelimeler" />
      {s.settings.focusCat && <div className="muted small">Kategori: {CAT_BY_ID[s.settings.focusCat]?.tr}</div>}
      <div className="fade" key={word.id}><WordCard word={word} autoplay /></div>
      <div className="row gap bottom-actions">
        <button className="btn" onClick={prev} disabled={idx === 0} aria-label="Önceki kelime"><Icon path={mdiArrowLeft} size={20} /></button>
        <button className="btn primary grow" onClick={next}>{back !== null ? 'İleri' : position >= ids.length ? 'Bitir' : 'Sonraki kelime'} <Icon path={mdiArrowRight} size={20} /></button>
      </div>
    </div>
  );
}
