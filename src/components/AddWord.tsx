import { mdiAlertOutline, mdiCheckCircle, mdiInformationOutline } from '@mdi/js';
import { useEffect, useState } from 'react';
import { type Level, type Word, capEn, capTr } from '../lib/data';
import { dictionaryReady, loadDictionary, lookup, type Lookup } from '../lib/spell';
import { addCustomWord, addToPlan, ensurePlan, makeCustomWord, updateCustomWord, useApp } from '../lib/store';
import { Icon, Sheet } from './ui';
import { t } from '../lib/i18n';

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
      if (clash) { setErr(t('"{w}" zaten var.', { w: clash.en })); return; }
      onClose(); return;
    }
    const r = addCustomWord(makeCustomWord(en, tr, extra));
    if (!r.added) { setErr(t('"{w}" zaten var.', { w: r.word.en })); return; }
    setSaved(r.word);
  }

  const exP = exists ? s.progress[exists.id] : undefined;
  return (
    <Sheet open={open} onClose={onClose} title={edit ? t('Kelimeyi düzenle') : t('Kendi kelimeni ekle')}>
      {saved ? (
        <div className="add-word">
          <p className="success-msg"><Icon path={mdiCheckCircle} size={20} /> {t('"{w}" eklendi.', { w: saved.en })}</p>
          <p className="muted small">{t('Kendi eklediğin kelimeler yeni kelime sırasında en öne gelir ve tüm testlerde (görselli testler hariç) sorulur.')}</p>
          <div className="stack-btns">
            <button className="btn primary" onClick={() => { ensurePlan(); addToPlan(saved.id); onClose(); goLearn(); }}>{t('Şimdi öğren')}</button>
            <button className="btn" onClick={() => { setSaved(null); setEn(''); setTr(''); setEx(''); setExTr(''); setSay(''); }}>{t('Bir kelime daha ekle')}</button>
          </div>
        </div>
      ) : (
        <form className="add-word" onSubmit={e => { e.preventDefault(); save(); }}>
          <label className="field">{t('İngilizce kelime')}
            <input value={en} onChange={e => { setEn(e.target.value); setErr(''); }} placeholder={t('ör. {x}', { x: 'apple' })} autoCapitalize="off" autoCorrect="off" spellCheck={false} autoComplete="off" required />
          </label>
          {!ready && en.trim() && <p className="muted small">{t('Yazım listesi yükleniyor…')}</p>}

          {exists && (
            <div className="notice info">
              <Icon path={mdiInformationOutline} size={20} />
              <div>
                <b>{t('Bu kelime sözlükte zaten var:')}</b> {capEn(exists.en)} = {capTr(exists.tr)}
                <div className="row gap wrap">
                  <button type="button" className="btn small" onClick={() => { onClose(); onOpenWord(exists.id); }}>{t('Kelimeyi aç')}</button>
                  {!exP && <button type="button" className="btn primary small" onClick={() => { ensurePlan(); addToPlan(exists.id); onClose(); goLearn(); }}>{t('Öğrenme listeme ekle')}</button>}
                  {exP && <span className="muted small">{t('Bu kelimeyi zaten öğreniyorsun.')}</span>}
                </div>
              </div>
            </div>
          )}
          {!exists && res && res.near.length > 0 && (
            <div className="notice info">
              <Icon path={mdiInformationOutline} size={20} />
              <div><b>{t('Bunu mu demek istediniz?')}</b>
                <div className="chips">{res.near.map(w => <button type="button" key={w.id} className="chip btnchip" onClick={() => setEn(w.en)}>{capEn(w.en)} · {capTr(w.tr)}</button>)}</div>
              </div>
            </div>
          )}
          {unknown && (() => { const extraSug = res!.suggestions.filter(x => !res!.near.some(w => w.en.toLowerCase() === x)); return (
            <div className="notice warn">
              <Icon path={mdiAlertOutline} size={20} />
              <div><b>{t('Bu kelime sözlükte bulunamadı, emin misin?')}</b>
                <span className="small"> {t('"{w}" İngilizce kelime listesinde yok. Yazım hatası olabilir.', { w: res!.unknownParts.join(', ') })}</span>
                {extraSug.length > 0 && <div className="chips">{extraSug.map(x => <button type="button" key={x} className="chip btnchip" onClick={() => setEn(x)}>{x}</button>)}</div>}
              </div>
            </div>
          ); })()}

          <label className="field">{t('Türkçe anlamı')}
            <input value={tr} onChange={e => setTr(e.target.value)} placeholder={t('ör. {x}', { x: 'elma' })} required />
          </label>
          <label className="field">{t('Okunuşu (isteğe bağlı)')}
            <input value={say} onChange={e => setSay(e.target.value)} placeholder={t('ör. {x}', { x: 'epıl' })} />
          </label>
          <label className="field">{t('Örnek cümle (isteğe bağlı)')}
            <input value={ex} onChange={e => setEx(e.target.value)} placeholder={t('ör. {x}', { x: 'I eat an apple every day.' })} />
          </label>
          <label className="field">{t('Örnek cümlenin Türkçesi (isteğe bağlı)')}
            <input value={exTr} onChange={e => setExTr(e.target.value)} />
          </label>
          <label className="field">{t('Seviye')}
            <select value={level} onChange={e => setLevel(e.target.value as Level)}><option>A1</option><option>A2</option><option>B1</option><option>B2</option></select>
          </label>
          {err && <p className="note">{err}</p>}
          <button type="submit" className="btn primary block" disabled={!canSave}>{edit ? t('Kaydet') : unknown ? t('Yine de kaydet') : t('Kelimeyi ekle')}</button>
          <p className="muted small">{t('Anlam kontrolü yapılamaz (internet ve ücretli servis yok); Türkçe anlamı kendin yazarsın. Kelimeleri sonradan düzenleyip silebilirsin.')}</p>
        </form>
      )}
    </Sheet>
  );
}
