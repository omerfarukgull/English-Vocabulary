import { mdiCheckCircle, mdiCloseCircle, mdiVolumeHigh, mdiTortoise, mdiArrowRight, mdiTrophyOutline } from '@mdi/js';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Icon, ProgressBar, WordCard, WordImage } from '../components/ui';
import { WORD_BY_ID } from '../lib/data';
import { buildQuestion, checkTyped, MODE_LABELS, pickMode, type Check, type Question } from '../lib/quiz';
import { speak } from '../lib/speech';
import type { QuizMode } from '../lib/srs';
import { availableModes, getState, markTestDone, recordAnswer, useApp } from '../lib/store';

export interface SessionConfig { ids: string[]; mode: QuizMode | 'mixed'; title: string; daily?: boolean }

function modeFor(id: string, wanted: QuizMode | 'mixed', last?: QuizMode): QuizMode {
  const avail = availableModes(id);
  if (wanted !== 'mixed' && avail.includes(wanted)) return wanted;
  const p = getState().progress[id];
  return pickMode(avail, p?.modes ?? [], last);
}

export default function Quiz({ config, onExit }: { config: SessionConfig; onExit: () => void }) {
  const { settings } = useApp();
  const [queue, setQueue] = useState<Question[]>(() => {
    let last: QuizMode | undefined;
    return config.ids.map(id => { const m = modeFor(id, config.mode, last); last = m; return buildQuestion(id, m); });
  });
  const [i, setI] = useState(0);
  const [answer, setAnswer] = useState<{ check: Check; picked?: string; typed?: string } | null>(null);
  const [results, setResults] = useState({ correct: 0, wrong: 0, wrongIds: [] as string[], typoIds: [] as string[] });
  const requeued = useRef(new Set<string>());
  const q = queue[i];
  const word = q ? WORD_BY_ID[q.id] : undefined;
  const done = i >= queue.length;

  useEffect(() => { if (done && config.daily) markTestDone(); }, [done, config.daily]);
  useEffect(() => {
    if (q?.mode === 'listen' && !answer) { const t = setTimeout(() => speak(WORD_BY_ID[q.id].en, settings.rate, settings.voice), 300); return () => clearTimeout(t); }
  }, [i, q?.mode]); // eslint-disable-line react-hooks/exhaustive-deps

  function submit(check: Check, extra: { picked?: string; typed?: string }) {
    if (!q || answer) return;
    const ok = check !== 'wrong';
    const p = getState().progress[q.id];
    const scheduled = !p || p.due <= Date.now();
    recordAnswer(q.id, check === 'typo' ? 'almost' : ok, q.mode, scheduled);
    setAnswer({ check, ...extra });
    setResults(r => ({ correct: r.correct + (ok ? 1 : 0), wrong: r.wrong + (ok ? 0 : 1), wrongIds: ok ? r.wrongIds : [...r.wrongIds, q.id], typoIds: check === 'typo' ? [...r.typoIds, q.id] : r.typoIds }));
    if (!ok) {
      speak(WORD_BY_ID[q.id].en, settings.rate, settings.voice);
      if (!requeued.current.has(q.id)) { // yanlış bilinen kelime oturum sonunda farklı bir yöntemle tekrar sorulur
        requeued.current.add(q.id);
        const m = modeFor(q.id, config.mode === 'mixed' ? 'mixed' : config.mode, q.mode);
        setQueue(qs => [...qs, buildQuestion(q.id, config.mode === 'mixed' ? m : q.mode)]);
      }
    } else if (q.mode !== 'listen') speak(WORD_BY_ID[q.id].en, settings.rate, settings.voice);
  }
  function next() { setAnswer(null); setI(x => x + 1); }

  if (done) {
    const total = results.correct + results.wrong;
    const pct = total ? Math.round(results.correct / total * 100) : 0;
    const uniqueWrong = [...new Set(results.wrongIds)];
    return (
      <div className="screen">
        <h1>{config.title}</h1>
        <div className="card celebrate">
          <Icon path={mdiTrophyOutline} size={56} />
          <h2>Tekrar tamamlandı</h2>
          <p><b>{results.correct}</b> doğru, <b>{results.wrong}</b> yanlış (%{pct})</p>
          {uniqueWrong.length > 0
            ? <><p className="muted">Bu kelimeler daha sık karşına çıkacak:</p><div className="chips">{uniqueWrong.map(id => <span key={id} className="chip">{WORD_BY_ID[id].en} – {WORD_BY_ID[id].tr}</span>)}</div></>
            : <p className="muted">Hepsini doğru bildin. Tekrar aralıkları uzatıldı.</p>}
          {results.typoIds.length > 0 && <><p className="muted">Yazımına dikkat et (yarın tekrar sorulacak):</p><div className="chips">{[...new Set(results.typoIds)].map(id => <span key={id} className="chip">{WORD_BY_ID[id].en}</span>)}</div></>}
          <button className="btn primary block" onClick={onExit}>Tamam</button>
        </div>
      </div>
    );
  }
  if (!q || !word) return null;

  const isChoice = q.mode === 'en-tr' || q.mode === 'img-choice' || q.mode === 'listen';
  return (
    <div className="screen quiz">
      <div className="row between"><button className="btn ghost small" onClick={onExit}>Bitir</button><span className="muted small">{MODE_LABELS[q.mode]}</span><span className="muted small">{i + 1} / {queue.length}</span></div>
      <ProgressBar value={i / queue.length} label="Test ilerlemesi" />
      <div className="fade q-body" key={i}>
        <Prompt q={q} />
        {isChoice
          ? <Choices q={q} answer={answer} onPick={id => submit(id === q.id ? 'correct' : 'wrong', { picked: id })} />
          : <Typed q={q} answer={answer} onSubmit={(t) => submit(checkTyped(q.id, t), { typed: t })} onGiveUp={() => submit('wrong', { typed: '' })} />}
      </div>
      {answer && (
        <div className={`feedback ${answer.check === 'wrong' ? 'bad' : answer.check === 'typo' ? 'almost' : 'good'}`}>
          <div className="fb-head">
            <Icon path={answer.check === 'wrong' ? mdiCloseCircle : mdiCheckCircle} size={26} />
            <b>{answer.check === 'correct' ? 'Doğru!' : answer.check === 'typo' ? 'Neredeyse doğru! Küçük bir yazım hatası var.' : 'Yanlış, sorun değil.'}</b>
          </div>
          {answer.check === 'typo' && <p className="fb-line typo-line">Senin yazdığın: <s>{answer.typed}</s> · Doğru yazımı: <b>{word.en}</b><br /><span className="muted small">Tam doğru sayılmadı; kelime yarın yeniden sorulacak.</span></p>}
          {answer.check === 'wrong'
            ? <div className="fb-card"><WordCard word={word} /></div>
            : <p className="fb-line"><b>{word.en}</b> = {word.tr} {[word.say, word.ipa].some(Boolean) && <span className="muted">· {[word.say, word.ipa].filter(Boolean).join(' · ')}</span>}</p>}
          <button className="btn primary block" onClick={next} autoFocus>Devam <Icon path={mdiArrowRight} size={20} /></button>
        </div>
      )}
    </div>
  );
}

function Prompt({ q }: { q: Question }) {
  const { settings } = useApp();
  const w = WORD_BY_ID[q.id];
  switch (q.mode) {
    case 'img-write': return <div className="prompt"><WordImage word={w} size={176} hideLabel /><p>Bu görselin İngilizcesini yaz.</p></div>;
    case 'img-choice': return <div className="prompt"><WordImage word={w} size={176} hideLabel /><p>Bu görsel hangi kelime?</p></div>;
    case 'tr-en': return <div className="prompt"><div className="big-word">{w.tr}</div><p>İngilizce karşılığını yaz.</p></div>;
    case 'en-tr': return <div className="prompt"><div className="big-word">{w.en}</div><p>Türkçe anlamı hangisi?</p></div>;
    case 'listen': return (
      <div className="prompt">
        <button className="listen-btn" onClick={() => speak(w.en, settings.rate, settings.voice)} aria-label="Tekrar dinle"><Icon path={mdiVolumeHigh} size={56} /></button>
        <button className="btn ghost small" onClick={() => speak(w.en, Math.max(0.5, settings.rate - 0.35), settings.voice)}><Icon path={mdiTortoise} size={18} /> Yavaş dinle</button>
        <p>Duyduğun kelime hangisi?</p>
      </div>);
  }
}

function Choices({ q, answer, onPick }: { q: Question; answer: { picked?: string } | null; onPick: (id: string) => void }) {
  const showTr = q.mode === 'en-tr';
  return (
    <div className="choices">
      {q.options!.map(id => {
        const w = WORD_BY_ID[id];
        const cls = answer ? (id === q.id ? 'right' : id === answer.picked ? 'wrongpick' : 'dim') : '';
        return <button key={id} className={`choice ${cls}`} disabled={!!answer} onClick={() => onPick(id)}>{showTr ? w.tr : w.en}</button>;
      })}
    </div>
  );
}

function Typed({ q, answer, onSubmit, onGiveUp }: { q: Question; answer: { typed?: string; check: Check } | null; onSubmit: (t: string) => void; onGiveUp: () => void }) {
  const [t, setT] = useState('');
  const ref = useRef<HTMLInputElement>(null);
  const w = WORD_BY_ID[q.id];
  const hint = useMemo(() => `${w.en.replace(/[^a-z]/gi, '').length} harf${w.en.includes(' ') ? ' (iki kelime)' : ''}`, [w]);
  useEffect(() => { ref.current?.focus({ preventScroll: true }); }, [q]);
  return (
    <form className="typed" onSubmit={e => { e.preventDefault(); if (t.trim()) onSubmit(t); }}>
      <input ref={ref} value={t} onChange={e => setT(e.target.value)} disabled={!!answer} placeholder="İngilizce kelimeyi yaz" aria-label="Cevabın"
        autoCapitalize="off" autoComplete="off" autoCorrect="off" spellCheck={false} enterKeyHint="done" inputMode="text"
        className={answer ? (answer.check === 'wrong' ? 'bad' : answer.check === 'typo' ? 'almost' : 'good') : ''} />
      {!answer && <div className="muted small">İpucu: {hint}</div>}
      {!answer && <div className="row gap"><button type="button" className="btn ghost" onClick={onGiveUp}>Bilmiyorum</button><button type="submit" className="btn primary grow" disabled={!t.trim()}>Kontrol et</button></div>}
    </form>
  );
}
