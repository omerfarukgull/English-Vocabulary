import { mdiMagnify, mdiStar, mdiStarOutline, mdiPlus, mdiPencilOutline, mdiDeleteOutline, mdiRepeat, mdiBookOpenVariant } from '@mdi/js';
import AddWord from '../components/AddWord';
import { useEffect, useMemo, useState } from 'react';
import { Confirm, Icon, Sheet, STATUS_LABEL, WordCard, WordImage } from '../components/ui';
import { CATEGORIES, WORDS, WORD_BY_ID, capEn, capTr, catName } from '../lib/data';
import { locale, t } from '../lib/i18n';
import { addToPlan, deleteCustomWord, ensurePlan, toggleFavorite, useApp } from '../lib/store';
import type { SessionConfig } from './Quiz';

type StatusFilter = 'seen' | 'all' | 'learning' | 'learned' | 'hard' | 'fav' | 'new';
const FILTERS: [StatusFilter, string][] = [['seen', 'Karşılaştıklarım'], ['learned', 'Öğrenilen'], ['learning', 'Öğreniliyor'], ['hard', 'Zorlandıklarım'], ['fav', 'Favoriler'], ['new', 'Henüz görülmeyen'], ['all', 'Tüm sözlük']];

export default function Words({ start, goLearn }: { start: (c: SessionConfig) => void; goLearn: () => void }) {
  const s = useApp();
  const [q, setQ] = useState('');
  const [f, setF] = useState<StatusFilter>('seen');
  const [cat, setCat] = useState('');
  const [level, setLevel] = useState('');
  const [open, setOpen] = useState<string | null>(null);
  const [limit, setLimit] = useState(100);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [delId, setDelId] = useState<string | null>(null);
  useEffect(() => setLimit(100), [q, f, cat, level]);

  const list = useMemo(() => {
    const qq = q.trim().toLocaleLowerCase('tr');
    return WORDS.filter(w => {
      const p = s.progress[w.id];
      if (f === 'seen' && !p) return false;
      if (f === 'new' && p) return false;
      if ((f === 'learning' || f === 'learned' || f === 'hard') && p?.status !== f) return false;
      if (f === 'fav' && !s.favorites.includes(w.id)) return false;
      if (cat && w.cat !== cat) return false;
      if (level && w.level !== level) return false;
      if (qq && !w.en.toLowerCase().includes(qq) && !w.tr.toLocaleLowerCase('tr').includes(qq)) return false;
      return true;
    }).sort((a, b) => f === 'seen' ? (s.progress[b.id]?.lastSeen ?? 0) - (s.progress[a.id]?.lastSeen ?? 0) : a.en.localeCompare(b.en));
  }, [s, q, f, cat, level]);

  const w = open ? WORD_BY_ID[open] : null;
  const p = w ? s.progress[w.id] : undefined;
  const fav = w ? s.favorites.includes(w.id) : false;

  return (
    <div className="screen">
      <div className="row between"><h1>{t('Kelimelerim')}</h1><button className="btn small" onClick={() => setAdding(true)}><Icon path={mdiPlus} size={20} /> {t('Kelime ekle')}</button></div>
      <div className="search"><Icon path={mdiMagnify} size={20} /><input type="search" value={q} onChange={e => setQ(e.target.value)} placeholder={t('İngilizce veya Türkçe ara')} aria-label={t('Kelime ara')} /></div>
      <div className="chips scroll" role="tablist">{FILTERS.map(([k, l]) => <button key={k} role="tab" aria-selected={f === k} className={`chip btnchip ${f === k ? 'on' : ''}`} onClick={() => setF(k)}>{t(l)}</button>)}</div>
      <div className="row gap">
        <select value={cat} onChange={e => setCat(e.target.value)} aria-label={t('Kategori')}><option value="">{t('Tüm kategoriler')}</option>{CATEGORIES.map(c => <option key={c.id} value={c.id}>{catName(c.id)}</option>)}</select>
        <select value={level} onChange={e => setLevel(e.target.value)} aria-label={t('Seviye')}><option value="">{t('Tüm seviyeler')}</option><option>A1</option><option>A2</option><option>B1</option></select>
      </div>
      <div className="muted small">{t('{n} kelime', { n: list.length })}</div>
      {list.length === 0
        ? <div className="card empty">{f === 'seen' && Object.keys(s.progress).length === 0 ? t('Henüz kelime öğrenmedin. Öğrendiğin kelimeler burada listelenecek.') : t('Bu filtreye uyan kelime yok.')}</div>
        : <ul className="word-list">{list.slice(0, limit).map(w => {
          const st = s.progress[w.id]?.status ?? 'new';
          return (
            <li key={w.id}>
              <button className="wl-main" onClick={() => setOpen(w.id)}>
                <WordImage word={w} size={48} />
                <div className="wl-text"><b>{capEn(w.en)}</b><span>{capTr(w.tr)}</span></div>
                <span className={`badge ${st}`}>{t(STATUS_LABEL[st])}</span>
              </button>
              <button className="icon-btn star" onClick={() => toggleFavorite(w.id)} aria-label={s.favorites.includes(w.id) ? t('Favorilerden çıkar') : t('Favorilere ekle')}><Icon path={s.favorites.includes(w.id) ? mdiStar : mdiStarOutline} /></button>
            </li>);
        })}</ul>}
      {list.length > limit && <button className="btn block" onClick={() => setLimit(l => l + 100)}>{t('Daha fazla göster ({n} kelime daha)', { n: list.length - limit })}</button>}

      <Sheet open={!!w} onClose={() => setOpen(null)} title={t('Kelime detayı')}>
        {w && <>
          <WordCard word={w} onPick={setOpen} />
          <div className="detail-stats">
            <span className={`badge ${p?.status ?? 'new'}`}>{t(STATUS_LABEL[p?.status ?? 'new'])}</span>
            {p && <span className="muted small">{t('{c} doğru · {w} yanlış · sonraki tekrar: {d}', { c: p.correct, w: p.wrong, d: p.due <= Date.now() ? t('şimdi') : new Date(p.due).toLocaleDateString(locale(), { day: 'numeric', month: 'short' }) })}</span>}
          </div>
          <div className="stack-btns">
            {p
              ? <button className="btn primary" onClick={() => { setOpen(null); start({ ids: [w.id], mode: 'mixed', title: t('Tekrar: {w}', { w: capEn(w.en) }) }); }}><Icon path={mdiRepeat} size={20} /> {t('Bu kelimeyi tekrar et')}</button>
              : <button className="btn primary" onClick={() => { ensurePlan(); addToPlan(w.id); setOpen(null); goLearn(); }}><Icon path={mdiBookOpenVariant} size={20} /> {t('Şimdi öğren')}</button>}
            <button className="btn" onClick={() => toggleFavorite(w.id)}><Icon path={fav ? mdiStar : mdiStarOutline} size={20} /> {fav ? t('Favoride') : t('Favorilere ekle')}</button>
          </div>
          {w.custom && <div className="row gap wrap">
            <span className="muted small grow">{t('Bu kelimeyi sen ekledin.')}</span>
            <button className="btn small" onClick={() => { setEditing(w.id); setOpen(null); }}><Icon path={mdiPencilOutline} size={18} /> {t('Düzenle')}</button>
            <button className="btn small danger" onClick={() => setDelId(w.id)}><Icon path={mdiDeleteOutline} size={18} /> {t('Sil')}</button>
          </div>}
        </>}
      </Sheet>
      <AddWord open={adding || !!editing} edit={editing ? WORD_BY_ID[editing] : null} onClose={() => { setAdding(false); setEditing(null); }}
        onOpenWord={id => { setF('all'); setOpen(id); }} goLearn={goLearn} />
      <Confirm open={!!delId} title={t('Kelime silinsin mi?')} text={delId && WORD_BY_ID[delId] ? t('"{w}" ve bu kelimedeki ilerlemen silinecek.', { w: WORD_BY_ID[delId].en }) : ''} confirmText={t('Sil')} danger
        onConfirm={() => { if (delId) deleteCustomWord(delId); setDelId(null); setOpen(null); }} onCancel={() => setDelId(null)} />
    </div>
  );
}
