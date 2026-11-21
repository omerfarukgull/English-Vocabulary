import { mdiVolumeHigh, mdiTortoise, mdiClose } from '@mdi/js';
import { useEffect, type ReactNode } from 'react';
import { CATEGORIES, catName, FAMILIES, ICONS, WORDS, WORD_BY_ID, type Word, capEn, capTr } from '../lib/data';
import { speak, speechSupported } from '../lib/speech';
import { useApp } from '../lib/store';
import { t } from '../lib/i18n';

export function Icon({ path, size = 24, className }: { path: string; size?: number; className?: string }) {
  return <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" className={className}><path d={path} fill="currentColor" /></svg>;
}

// Kategori başına sakin bir renk tonu (HSL hue)
export const CAT_HUE: Record<string, number> = {
  daily: 210, food: 8, animals: 28, home: 175, people: 330, work: 230, travel: 195, transport: 250,
  nature: 140, emotions: 45, verbs: 280, adjectives: 300, tech: 220, shopping: 160, health: 355, clothing: 260,
  school: 38, sports: 120, city: 200, time: 185, colors: 320, arts: 290, society: 15, abstract: 240, adverbs: 165,
};

/** Kelime görseli: tek nesne odaklı ikon. İkon yoksa alakasız görsel yerine nötr harf kartı. */
// Icon data is either an MDI path `d` (24x24) or `viewBox|svg body` (other sets, two-part scenes)
function IconSvg({ data, size }: { data: string; size: number }) {
  const sep = data.indexOf('|');
  if (sep < 0) return <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true"><path d={data} fill="currentColor" /></svg>;
  const vb = data.slice(0, sep);
  const wide = vb.split(' ')[2] !== vb.split(' ')[3];
  return <svg viewBox={vb} width={wide ? size * 1.45 : size} height={wide ? size * 1.45 * 24 / 52 : size} fill="currentColor" aria-hidden="true" dangerouslySetInnerHTML={{ __html: data.slice(sep + 1) }} />;
}

export function WordImage({ word, size = 160, hideLabel }: { word: Word; size?: number; hideLabel?: boolean }) {
  const hue = CAT_HUE[word.cat] ?? 210;
  const d = ICONS[word.id];
  const style = { width: size, height: size, ['--h' as string]: hue } as React.CSSProperties;
  if (d) {
    return (
      <div className="word-img" style={style} role="img" aria-label={hideLabel ? t('Kelime görseli') : word.en}>
        <IconSvg data={d} size={size * 0.56} />
      </div>
    );
  }
  return (
    <div className="word-img fallback" style={style} role="img" aria-label={hideLabel ? t('Görsel yok') : t('{w} (görsel yok)', { w: word.en })}>
      <span style={{ fontSize: size * 0.38 }}>{word.en[0].toUpperCase()}</span>
      {size >= 100 && <small>{catName(word.cat)}</small>}
    </div>
  );
}

export function SpeakButton({ text, label, compact }: { text: string; label?: string; compact?: boolean }) {
  const { settings } = useApp();
  if (!speechSupported) return null;
  return (
    <span className="speak-group">
      <button className={compact ? 'icon-btn' : 'speak-btn'} onClick={() => speak(text, settings.rate, settings.voice)} aria-label={t('{x} dinle', { x: label ?? text })}>
        <Icon path={mdiVolumeHigh} size={compact ? 20 : 22} />{!compact && <span>{label ?? t('Dinle')}</span>}
      </button>
      {!compact && <button className="icon-btn" onClick={() => speak(text, Math.max(0.5, settings.rate - 0.35), settings.voice)} aria-label={t('Yavaş dinle')} title={t('Yavaş dinle')}><Icon path={mdiTortoise} size={20} /></button>}
    </span>
  );
}

export function NoSpeechNote() {
  if (speechSupported) return null;
  return <p className="note">{t('Bu cihaz/tarayıcı sesli okumayı desteklemiyor. Telaffuz için okunuş ve IPA yazımını kullanabilirsin.')}</p>;
}

/** Kelimenin tam öğrenme kartı içeriği (öğren ekranı, detay ve yanlış cevap sonrası). */
export function WordCard({ word, autoplay, onPick }: { word: Word; autoplay?: boolean; onPick?: (id: string) => void }) {
  const { settings } = useApp();
  useEffect(() => {
    if (autoplay && settings.autoplay) { const t = setTimeout(() => speak(word.en, settings.rate, settings.voice), 250); return () => clearTimeout(t); }
  }, [word.id, autoplay]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="word-card">
      <WordImage word={word} size={168} />
      <div className="wc-en">{capEn(word.en)}</div>
      <div className="wc-tr">{capTr(word.tr)}</div>
      {(word.say || word.ipa) && <div className="wc-pron">
        {word.say && <span><b>{t('Okunuş:')}</b> {word.say}</span>}
        {word.ipa && <span className="ipa">{word.ipa}</span>}
      </div>}
      <SpeakButton text={word.en} label={t('Kelimeyi dinle')} />
      <NoSpeechNote />
      {word.hint && <div className="wc-hint"><b>{t('Hafıza ipucu')}</b><span>{word.hint}</span></div>}
      {word.ex && <div className="wc-example">
        <div className="ex-en">{word.ex}{' '}<SpeakButton text={word.ex} compact label={t('Örnek cümleyi')} /></div>
        {word.exTr && <div className="ex-tr">{word.exTr}</div>}
      </div>}
      {FAMILIES[word.id] && <div className="wc-family"><b>{t('Kelime ailesi')}</b><div className="chips">{FAMILIES[word.id].filter(id => WORD_BY_ID[id]).map(id => onPick
        ? <button key={id} className="chip btnchip" onClick={() => onPick(id)}>{capEn(WORD_BY_ID[id].en)} · {capTr(WORD_BY_ID[id].tr)}</button>
        : <span key={id} className="chip">{capEn(WORD_BY_ID[id].en)} · {capTr(WORD_BY_ID[id].tr)}</span>)}</div></div>}
      <div className="wc-meta"><span className="chip">{catName(word.cat)}</span><span className="chip">{word.level}</span></div>
    </div>
  );
}

export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title?: string; children: ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label={title} onClick={e => e.stopPropagation()}>
        <div className="sheet-head"><h2>{title}</h2><button className="icon-btn" onClick={onClose} aria-label={t('Kapat')}><Icon path={mdiClose} /></button></div>
        <div className="sheet-body">{children}</div>
      </div>
    </div>
  );
}

export function Confirm({ open, title, text, confirmText, danger, onConfirm, onCancel }: { open: boolean; title: string; text: string; confirmText: string; danger?: boolean; onConfirm: () => void; onCancel: () => void }) {
  if (!open) return null;
  return (
    <div className="sheet-backdrop center" onClick={onCancel}>
      <div className="dialog" role="alertdialog" aria-modal="true" onClick={e => e.stopPropagation()}>
        <h2>{title}</h2><p>{text}</p>
        <div className="row end"><button className="btn ghost" onClick={onCancel}>{t('Vazgeç')}</button><button className={danger ? 'btn danger' : 'btn primary'} onClick={onConfirm}>{confirmText}</button></div>
      </div>
    </div>
  );
}

export function ProgressBar({ value, label }: { value: number; label?: string }) {
  const v = Math.max(0, Math.min(1, value));
  return <div className="pbar" role="progressbar" aria-valuenow={Math.round(v * 100)} aria-valuemin={0} aria-valuemax={100} aria-label={label}><div style={{ width: `${v * 100}%` }} /></div>;
}

export const STATUS_LABEL = { new: 'Yeni', learning: 'Öğreniliyor', learned: 'Öğrenildi', hard: 'Zorlanıyorum' } as const;

/** Çalışılan kategori seçimi: yeni kelimeler (Öğren) bu kategoriden gelir. İlerleme tüm kategorilerde ortaktır. */
export function FocusPicker({ value, onChange, label, countMode = 'new' }: { value: string; onChange: (c: string) => void; label?: string; countMode?: 'new' | 'seen' }) {
  const s = useApp();
  const counts = new Map<string, number>();
  for (const w of WORDS) {
    const hit = countMode === 'new' ? !s.progress[w.id] : !!s.progress[w.id];
    if (hit) counts.set(w.cat, (counts.get(w.cat) ?? 0) + 1);
  }
  const lbl = label ?? t('Çalışılan kategori');
  const cnt = (n: number) => countMode === 'new' ? t('{n} yeni', { n }) : t('{n} kelime', { n });
  const total = [...counts.values()].reduce((a, b) => a + b, 0);
  return (
    <label className="focus-pick">
      <span className="muted small">{lbl}</span>
      <select value={value} onChange={e => onChange(e.target.value)} aria-label={lbl}>
        <option value="">{t('Tüm kategoriler')} ({cnt(total)})</option>
        {CATEGORIES.filter(c => WORDS.some(w => w.cat === c.id)).map(c => <option key={c.id} value={c.id}>{catName(c.id)} ({cnt(counts.get(c.id) ?? 0)})</option>)}
      </select>
    </label>
  );
}
