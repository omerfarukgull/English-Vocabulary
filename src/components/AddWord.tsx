import { mdiAlertOutline, mdiCheckCircle, mdiInformationOutline } from '@mdi/js';
import { useEffect, useState } from 'react';
import { type Level, type Word, capEn, capTr } from '../lib/data';
import { dictionaryReady, loadDictionary, lookup, type Lookup } from '../lib/spell';
import { addCustomWord, addToPlan, ensurePlan, makeCustomWord, updateCustomWord, useApp } from '../lib/store';
import { Icon, Sheet } from './ui';

/** Kendi kelimeni ekle / düzenle. Sözlükte olan kelime yeniden eklenmez; yazım hatası için öneri gösterilir. */
export default function AddWord({ open, onClose, edit, onOpenWord, goLearn }: {
  open: boolean; onClose: () => void; edit?: Word | null; onOpenWord: (id: string) => void; goLearn: () => void;
}) {
  const s = useApp();
  const [en, setEn] = useState(''); const [tr, setTr] = useState('');
  const [ex, setEx] = useState(''); const [exTr, setExTr] = useState(''); const [say, setSay] = useState('');
  const [level, setLevel] = useState<Level>('A2');
  const [res, setRes] = useState<Lookup | null>(null);
  const [ready, setReady] = useState(dictionaryReady());
  const [saved, setSaved] = useState<Word | null>(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (!open) return;
    setEn(edit?.en ?? ''); setTr(edit?.tr ?? ''); setEx(edit?.ex ?? ''); setExTr(edit?.exTr ?? ''); setSay(edit?.say ?? ''); setLevel(edit?.level ?? 'A2');
    setSaved(null); setErr(''); setRes(null);
    loadDictionary().then(() => setReady(true)).catch(() => setReady(false));
  }, [open, edit]);
  useEffect(() => {
    if (!en.trim()) { setRes(null); return; }
    const t = setTimeout(() => setRes(lookup(en)), 200);
    return () => clearTimeout(t);
  }, [en, ready]);

  const exists = res?.exact && res.exact.id !== edit?.id ? res.exact : undefined;
  const unknown = ready && res && !res.known && !exists;
  const canSave = en.trim() && tr.trim() && !exists && /[a-z]/i.test(en);

  function save() {
    if (!canSave) return;
    const extra = { ex, exTr, say, level };
    if (edit) {
      const clash = updateCustomWord(edit.id, en, tr, extra);
      if (clash) { setErr(`"${clash.en}" zaten var.`); return; }
      onClose(); return;
    }
    const r = addCustomWord(makeCustomWord(en, tr, extra));
    if (!r.added) { setErr(`"${r.word.en}" zaten var.`); return; }
    setSaved(r.word);
  }

  const exP = exists ? s.progress[exists.id] : undefined;
  return (
    <Sheet open={open} onClose={onClose} title={edit ? 'Kelimeyi düzenle' : 'Kendi kelimeni ekle'}>
      {saved ? (
        <div className="add-word">
          <p className="success-msg"><Icon path={mdiCheckCircle} size={20} /> "{saved.en}" eklendi.</p>
          <p className="muted small">Kendi eklediğin kelimeler yeni kelime sırasında en öne gelir ve tüm testlerde (görselli testler hariç) sorulur.</p>
          <div className="row gap wrap">
            <button className="btn" onClick={() => { setSaved(null); setEn(''); setTr(''); setEx(''); setExTr(''); setSay(''); }}>Bir kelime daha ekle</button>
            <button className="btn primary grow" onClick={() => { ensurePlan(); addToPlan(saved.id); onClose(); goLearn(); }}>Şimdi öğren</button>
          </div>
        </div>
      ) : (
        <form className="add-word" onSubmit={e => { e.preventDefault(); save(); }}>
          <label className="field">İngilizce kelime
            <input value={en} onChange={e => { setEn(e.target.value); setErr(''); }} placeholder="ör. apple" autoCapitalize="off" autoCorrect="off" spellCheck={false} autoComplete="off" required />
          </label>
          {!ready && en.trim() && <p className="muted small">Yazım listesi yükleniyor…</p>}

          {exists && (
            <div className="notice info">
              <Icon path={mdiInformationOutline} size={20} />
              <div>
                <b>Bu kelime sözlükte zaten var:</b> {capEn(exists.en)} = {capTr(exists.tr)}
                <div className="row gap wrap">
                  <button type="button" className="btn small" onClick={() => { onClose(); onOpenWord(exists.id); }}>Kelimeyi aç</button>
                  {!exP && <button type="button" className="btn primary small" onClick={() => { ensurePlan(); addToPlan(exists.id); onClose(); goLearn(); }}>Öğrenme listeme ekle</button>}
                  {exP && <span className="muted small">Bu kelimeyi zaten öğreniyorsun.</span>}
                </div>
              </div>
            </div>
          )}
          {!exists && res && res.near.length > 0 && (
            <div className="notice info">
              <Icon path={mdiInformationOutline} size={20} />
              <div><b>Bunu mu demek istediniz?</b>
                <div className="chips">{res.near.map(w => <button type="button" key={w.id} className="chip btnchip" onClick={() => setEn(w.en)}>{capEn(w.en)} · {capTr(w.tr)}</button>)}</div>
              </div>
            </div>
          )}
          {unknown && (() => { const extraSug = res!.suggestions.filter(x => !res!.near.some(w => w.en.toLowerCase() === x)); return (
            <div className="notice warn">
              <Icon path={mdiAlertOutline} size={20} />
              <div><b>Bu kelime sözlükte bulunamadı, emin misin?</b>
                <span className="small"> "{res!.unknownParts.join(', ')}" İngilizce kelime listesinde yok. Yazım hatası olabilir.</span>
                {extraSug.length > 0 && <div className="chips">{extraSug.map(x => <button type="button" key={x} className="chip btnchip" onClick={() => setEn(x)}>{x}</button>)}</div>}
              </div>
            </div>
          ); })()}

          <label className="field">Türkçe anlamı
            <input value={tr} onChange={e => setTr(e.target.value)} placeholder="ör. elma" required />
          </label>
          <label className="field">Okunuşu (isteğe bağlı)
            <input value={say} onChange={e => setSay(e.target.value)} placeholder="ör. epıl" />
          </label>
          <label className="field">Örnek cümle (isteğe bağlı)
            <input value={ex} onChange={e => setEx(e.target.value)} placeholder="ör. I eat an apple every day." />
          </label>
          <label className="field">Örnek cümlenin Türkçesi (isteğe bağlı)
            <input value={exTr} onChange={e => setExTr(e.target.value)} />
          </label>
          <label className="field">Seviye
            <select value={level} onChange={e => setLevel(e.target.value as Level)}><option>A1</option><option>A2</option><option>B1</option></select>
          </label>
          {err && <p className="note">{err}</p>}
          <button type="submit" className="btn primary block" disabled={!canSave}>{edit ? 'Kaydet' : unknown ? 'Yine de kaydet' : 'Kelimeyi ekle'}</button>
          <p className="muted small">Anlam kontrolü yapılamaz (internet ve ücretli servis yok); Türkçe anlamı kendin yazarsın. Kelimeleri sonradan düzenleyip silebilirsin.</p>
        </form>
      )}
    </Sheet>
  );
}
