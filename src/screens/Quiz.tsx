import { mdiCheckCircle, mdiCloseCircle, mdiVolumeHigh, mdiTortoise, mdiArrowRight, mdiTrophyOutline } from '@mdi/js';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Icon, ProgressBar, WordCard, WordImage } from '../components/ui';
import { WORD_BY_ID, capEn, capTr } from '../lib/data';
import { buildQuestion, checkTyped, MODE_LABELS, pickMode, type Check, type Question } from '../lib/quiz';
import { speak } from '../lib/speech';
import type { QuizMode } from '../lib/srs';
import { availableModes, getState, markTestDone, recordAnswer, useApp } from '../lib/store';
import { t } from '../lib/i18n';

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
          <h2>{t('Tekrar tamamlandı')}</h2>
          <p>{t('{c} doğru, {w} yanlış (%{p})', { c: results.correct, w: results.wrong, p: pct })}</p>
          {uniqueWrong.length > 0
            ? <><p className="muted">{t('Bu kelimeler daha sık karşına çıkacak:')}</p><div className="chips">{uniqueWrong.map(id => <span key={id} className="chip">{capEn(WORD_BY_ID[id].en)} – {capTr(WORD_BY_ID[id].tr)}</span>)}</div></>
            : <p className="muted">{t('Hepsini doğru bildin. Tekrar aralıkları uzatıldı.')}</p>}
          {results.typoIds.length > 0 && <><p className="muted">{t('Yazımına dikkat et (yarın tekrar sorulacak):')}</p><div className="chips">{[...new Set(results.typoIds)].map(id => <span key={id} className="chip">{capEn(WORD_BY_ID[id].en)}</span>)}</div></>}
          <button className="btn primary block" onClick={onExit}>{t('Tamam')}</button>
        </div>
      </div>
    );
  }
  if (!q || !word) return null;

  const isChoice = q.mode === 'en-tr' || q.mode === 'img-choice' || q.mode === 'listen';
  return (
    <div className="screen quiz">
      <div className="row between"><button className="btn ghost small" onClick={onExit}>{t('Bitir')}</button><span className="muted small">{t(MODE_LABELS[q.mode])}</span><span className="muted small">{i + 1} / {queue.length}</span></div>
      <ProgressBar value={i / queue.length} label={t('Test ilerlemesi')} />
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
            <b>{answer.check === 'correct' ? t('Doğru!') : answer.check === 'typo' ? t('Neredeyse doğru! Küçük bir yazım hatası var.') : t('Yanlış, sorun değil.')}</b>
          </div>
          {answer.check === 'typo' && <p className="fb-line typo-line">{t('Senin yazdığın:')} <s>{answer.typed}</s> · {t('Doğru yazımı:')} <b>{capEn(word.en)}</b><br /><span className="muted small">{t('Tam doğru sayılmadı; kelime yarın yeniden sorulacak.')}</span></p>}
          {answer.check === 'wrong'
            ? <div className="fb-card"><WordCard word={word} /></div>
            : <p className="fb-line"><b>{capEn(word.en)}</b> = {capTr(word.tr)} {[word.say, word.ipa].some(Boolean) && <span className="muted">· {[word.say, word.ipa].filter(Boolean).join(' · ')}</span>}</p>}
          <button className="btn primary block" onClick={next} autoFocus>{t('Devam')} <Icon path={mdiArrowRight} size={20} /></button>
        </div>
      )}
    </div>
  );
}

function Prompt({ q }: { q: Question }) {
  const { settings } = useApp();
  const w = WORD_BY_ID[q.id];
  switch (q.mode) {
    case 'img-write': return <div className="prompt"><WordImage word={w} size={176} hideLabel /><div className="prompt-tr">{capTr(w.tr)}</div><p>{t('Bu kelimenin İngilizcesini yaz.')}</p></div>;
    case 'img-choice': return <div className="prompt"><WordImage word={w} size={176} hideLabel /><div className="prompt-tr">{capTr(w.tr)}</div><p>{t('İngilizcesi hangisi?')}</p></div>;
    case 'tr-en': return <div className="prompt"><div className="big-word">{capTr(w.tr)}</div><p>{t('İngilizce karşılığını yaz.')}</p></div>;
    case 'en-tr': return <div className="prompt"><div className="big-word">{capEn(w.en)}</div><p>{t('Türkçe anlamı hangisi?')}</p></div>;
    case 'listen': return (
      <div className="prompt">
        <button className="listen-btn" onClick={() => speak(w.en, settings.rate, settings.voice)} aria-label={t('Tekrar dinle')}><Icon path={mdiVolumeHigh} size={56} /></button>
        <button className="btn ghost small" onClick={() => speak(w.en, Math.max(0.5, settings.rate - 0.35), settings.voice)}><Icon path={mdiTortoise} size={18} /> {t('Yavaş dinle')}</button>
        <p>{t('Duyduğun kelime hangisi?')}</p>
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
        return <button key={id} className={`choice ${cls}`} disabled={!!answer} onClick={() => onPick(id)}>{showTr ? capTr(w.tr) : capEn(w.en)}</button>;
      })}
    </div>
  );
}

function Typed({ q, answer, onSubmit, onGiveUp }: { q: Question; answer: { typed?: string; check: Check } | null; onSubmit: (t: string) => void; onGiveUp: () => void }) {
  const [val, setVal] = useState('');
  const ref = useRef<HTMLInputElement>(null);
  const w = WORD_BY_ID[q.id];
  const hint = useMemo(() => t('{n} harf', { n: w.en.replace(/[^a-z]/gi, '').length }) + (w.en.includes(' ') ? t(' (iki kelime)') : ''), [w]);
  useEffect(() => { ref.current?.focus({ preventScroll: true }); }, [q]);
  return (
    <form className="typed" onSubmit={e => { e.preventDefault(); if (val.trim()) onSubmit(val); }}>
      <input ref={ref} value={val} onChange={e => setVal(e.target.value)} disabled={!!answer} placeholder={t('İngilizce kelimeyi yaz')} aria-label={t('Cevabın')}
        autoCapitalize="off" autoComplete="off" autoCorrect="off" spellCheck={false} enterKeyHint="done" inputMode="text"
        className={answer ? (answer.check === 'wrong' ? 'bad' : answer.check === 'typo' ? 'almost' : 'good') : ''} />
      {!answer && <div className="muted small">{t('İpucu: {h}', { h: hint })}</div>}
      {!answer && <div className="row gap"><button type="button" className="btn ghost" onClick={onGiveUp}>{t('Bilmiyorum')}</button><button type="submit" className="btn primary grow" disabled={!val.trim()}>{t('Kontrol et')}</button></div>}
    </form>
  );
}
