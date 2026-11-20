import { mdiFire } from '@mdi/js';
import { Icon, ProgressBar } from '../components/ui';
import { CATEGORIES, WORD_BY_ID } from '../lib/data';
import { addDays, dayKey, formatDayShort } from '../lib/date';
import { dueIds, streak, todayNewCount, useApp } from '../lib/store';

export default function Stats() {
  const s = useApp();
  const prog = Object.entries(s.progress);
  const learned = prog.filter(([, p]) => p.status === 'learned').length;
  const learning = prog.filter(([, p]) => p.status === 'learning').length;
  const hard = prog.filter(([, p]) => p.status === 'hard').length;
  const days = Object.values(s.days);
  const correct = days.reduce((a, d) => a + d.correct, 0);
  const wrong = days.reduce((a, d) => a + d.wrong, 0);
  const acc = correct + wrong ? Math.round(correct / (correct + wrong) * 100) : null;
  const st = streak(s);
  const today = dayKey();

  // kategori zorluğu: yanlış oranı (en az 3 cevap)
  const cats = CATEGORIES.map(c => {
    let cr = 0, wr = 0;
    for (const [id, p] of prog) if (WORD_BY_ID[id].cat === c.id) { cr += p.correct; wr += p.wrong; }
    return { c, cr, wr, rate: cr + wr ? wr / (cr + wr) : 0 };
  }).filter(x => x.cr + x.wr >= 3 && x.wr > 0).sort((a, b) => b.rate - a.rate).slice(0, 3);

  const last14 = Array.from({ length: 14 }, (_, i) => addDays(today, i - 13));
  const max = Math.max(1, ...last14.map(k => (s.days[k]?.newWords ?? 0) + (s.days[k]?.reviews ?? 0)));
  const week = (offset: number) => Array.from({ length: 7 }, (_, i) => s.days[addDays(today, offset - i)]).reduce((a, d) => ({ n: a.n + (d?.newWords ?? 0), r: a.r + (d?.reviews ?? 0), active: a.active + (d && (d.newWords || d.reviews) ? 1 : 0) }), { n: 0, r: 0, active: 0 });
  const thisW = week(0), lastW = week(-7);

  return (
    <div className="screen">
      <h1>İstatistik</h1>
      <section className="grid2">
        <Tile n={learned} l="Öğrenilen toplam" />
        <Tile n={prog.length} l="Karşılaşılan kelime" />
        <Tile n={todayNewCount(s)} l="Bugün öğrenilen" />
        <Tile n={dueIds(s).length} l="Tekrar bekleyen" />
        <Tile n={acc === null ? '–' : `%${acc}`} l="Doğru cevap oranı" />
        <Tile n={wrong} l="Yanlış cevap" />
      </section>

      <section className="card">
        <h2>Öğrenme serisi</h2>
        <div className="row gap center-v"><Icon path={mdiFire} size={32} className="fire" /><div><b className="big">{st.current} gün</b><div className="muted small">En uzun seri: {st.best} gün</div></div></div>
      </section>

      <section className="card">
        <h2>Günlük öğrenme (son 14 gün)</h2>
        <svg className="chart" viewBox="0 0 280 130" role="img" aria-label="Son 14 günün yeni kelime ve tekrar sayıları">
          {last14.map((k, i) => {
            const d = s.days[k]; const n = d?.newWords ?? 0, r = d?.reviews ?? 0;
            const hn = n / max * 100, hr = r / max * 100; const x = i * 20 + 3;
            return <g key={k}>
              <title>{`${k}: ${n} yeni, ${r} tekrar`}</title>
              <rect x={x} y={110 - hn} width={14} height={hn} rx={2} className="bar-new" />
              <rect x={x} y={110 - hn - hr} width={14} height={hr} rx={2} className="bar-rev" />
              {(i % 2 === 1 || i === 13) && <text x={x + 7} y={124} textAnchor="middle" className="axis">{i === 13 ? 'Bugün' : formatDayShort(k)}</text>}
            </g>;
          })}
          <line x1="0" x2="280" y1="110.5" y2="110.5" className="baseline" />
        </svg>
        <div className="legend"><span><i className="sw new" />Yeni kelime</span><span><i className="sw rev" />Tekrar (cevap)</span><span className="muted">en yüksek: {max}</span></div>
      </section>

      <section className="card">
        <h2>Haftalık ilerleme</h2>
        <table className="wk"><thead><tr><th></th><th>Bu hafta</th><th>Geçen hafta</th></tr></thead>
          <tbody>
            <tr><td>Yeni kelime</td><td>{thisW.n}</td><td>{lastW.n}</td></tr>
            <tr><td>Tekrar cevabı</td><td>{thisW.r}</td><td>{lastW.r}</td></tr>
            <tr><td>Aktif gün</td><td>{thisW.active} / 7</td><td>{lastW.active} / 7</td></tr>
          </tbody></table>
        <p className="muted small">Son 7 gün ile önceki 7 gün karşılaştırılır.</p>
      </section>

      <section className="card">
        <h2>Kelime durumları</h2>
        {[['Öğrenildi', learned, 'learned'], ['Öğreniliyor', learning, 'learning'], ['Zorlanıyorum', hard, 'hard']].map(([l, n, c]) => (
          <div key={c as string} className="status-row"><span className={`badge ${c}`}>{l}</span><ProgressBar value={prog.length ? (n as number) / prog.length : 0} label={l as string} /><b>{n}</b></div>
        ))}
      </section>

      <section className="card">
        <h2>En çok zorlandığın kategoriler</h2>
        {cats.length === 0
          ? <p className="muted">Yeterli veri yok. Birkaç test çözdükten sonra burada görünecek.</p>
          : cats.map(x => <div key={x.c.id} className="status-row"><span className="cat-name">{x.c.tr}</span><ProgressBar value={x.rate} label={x.c.tr} /><b>%{Math.round(x.rate * 100)}</b></div>)}
        {cats.length > 0 && <p className="muted small">Yüzde: o kategorideki cevapların yanlış oranı.</p>}
      </section>
    </div>
  );
}
function Tile({ n, l }: { n: number | string; l: string }) { return <div className="tile"><b>{n}</b><span>{l}</span></div>; }
