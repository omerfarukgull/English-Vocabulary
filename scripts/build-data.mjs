// Reads data/*.psv (+ data/images.txt), validates it and generates src/data/words.json + src/data/icons.json
import fs from 'node:fs';
import path from 'node:path';
import { POS, DIR, CMP, freq } from './diagrams.mjs';
import { families, EXCLUDE } from './families.mjs';
import { autoHint } from './autohint.mjs';
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const iconDir = path.join(root, 'node_modules/@mdi/svg/svg');
// Extra open-licensed icon sets (Iconify JSON): ms = Material Symbols (Apache-2.0), gi = Game-icons.net (CC BY 3.0), hi = Healthicons (MIT)
// ph = Phosphor (MIT, *-fill), fa = Font Awesome 6 Free Solid (CC BY 4.0), fl = Fluent UI System Icons (MIT, *-filled), mc = MingCute (Apache-2.0, *-fill)
const SETS = { ms: 'material-symbols', gi: 'game-icons', hi: 'healthicons', ph: 'ph', fa: 'fa6-solid', fl: 'fluent', mc: 'mingcute' };
const setCache = {};
const loadSet = k => setCache[k] ??= JSON.parse(fs.readFileSync(path.join(root, 'node_modules/@iconify-json', SETS[k], 'icons.json'), 'utf8'));
// Returns [size, svgBody] for 'set:name' (mdi when no prefix) or null
function iconBody(ref) {
  const [set, name] = ref.includes(':') ? ref.split(':') : ['mdi', ref];
  // self-made colour swatch for colour words: `color:#rrggbb` (paint blob with a thin outline so white/black stay visible)
  // self-made numeral tile for number words: `text:40`, `text:3rd`, `text:½`
  if (set === 'text') {
    const t = name.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); const len = name.length; const fs = [0, 15, 14, 11, 8.5, 7, 6][Math.min(len, 6)];
    return [24, `<text x="12" y="${12 + fs * 0.36}" text-anchor="middle" font-size="${fs}" font-weight="700" font-family="system-ui,-apple-system,'Segoe UI',Roboto,sans-serif">${t}</text>`];
  }
  if (set === 'pos') return POS[name] ? [24, POS[name]] : null;
  if (set === 'cmp') return CMP[name] ? [24, CMP[name]] : null;
  if (set === 'dir') return DIR[name] ? [24, DIR[name]] : null;
  if (set === 'freq') return /^[0-5]$/.test(name) ? [24, freq(+name)] : null;
  if (set === 'color') return /^#[0-9a-f]{6}$/i.test(name) ? [24, `<path fill="${name}" stroke="#00000040" stroke-width=".6" d="M12 2.5c5.2 0 9.5 3.6 9.5 8.6c0 3-2.4 4.4-4.6 4.4h-1.6c-1 0-1.6.7-1.6 1.5c0 .5.3.9.5 1.3c.3.4.5.9.5 1.4c0 1.3-1 1.8-2.4 1.8C7 21.5 2.5 17.2 2.5 12S6.8 2.5 12 2.5Z"/>`] : null;
  if (set === 'mdi') {
    const f = path.join(iconDir, name + '.svg');
    if (!fs.existsSync(f)) return null;
    return [24, `<path d="${fs.readFileSync(f, 'utf8').match(/ d="([^"]+)"/)[1]}"/>`];
  }
  if (!SETS[set]) return null;
  const j = loadSet(set); const ic = j.icons[name];
  if (!ic) return null;
  if (/stroke|fill="(?!currentColor)/.test(ic.body)) return null; // only solid single-colour glyphs, for a consistent style
  const w = ic.width || j.width || 24, h = ic.height || j.height || 24, sz = Math.max(w, h);
  const body = ic.body.replace(/ fill="currentColor"/g, '');
  return [sz, w === h ? body : `<g transform="translate(${(sz - w) / 2} ${(sz - h) / 2})">${body}</g>`];
}
// Combines 1-2 icons into one svg {v: viewBox width, b: body}. Two icons are drawn side by side (scenes / opposites).
function compose(refs) {
  const parts = refs.map(iconBody);
  if (parts.some(p => !p)) return null;
  if (parts.length === 1) { const [sz, b] = parts[0]; return sz === 24 && b.startsWith('<path d=') && !b.includes('/><') ? b.match(/d="([^"]+)"/)[1] : `0 0 ${sz} ${sz}|${b}`; }
  // two glyphs, each scaled into a 24x24 cell, on a 52x24 canvas with a 4 unit gap
  const g = parts.map(([sz, b], i) => `<g transform="translate(${i * 28} 0) scale(${24 / sz})">${b}</g>`).join('');
  return `0 0 52 24|${g}`;
}
const files = fs.readdirSync(path.join(root, 'data')).filter(f => f.endsWith('.psv')).sort();
const lines = files.flatMap(f => fs.readFileSync(path.join(root, 'data', f), 'utf8').split('\n').map(l => [f, l]));
const warnings = [];
const categories = [];
const words = [];
const errors = [];
let cat = null;
const seenEn = new Map(), seenTr = new Map(), seenIcon = new Map();
const icons = {};
// data/images.txt: per-word picture overrides, `word-id|set:icon` or `word-id|set:a+set:b` (two-part scene)
const imageMap = new Map();
const imgFile = path.join(root, 'data/images.txt');
if (fs.existsSync(imgFile)) for (const [n, raw] of fs.readFileSync(imgFile, 'utf8').split('\n').entries()) {
  const l = raw.replace(/^#.*|\s#\s.*$/, '').trim(); if (!l) continue;
  const [id, ref] = l.split('|').map(s => s.trim());
  if (!ref) { errors.push(`images.txt:${n + 1}: bozuk satır: ${l}`); continue; }
  if (imageMap.has(id)) errors.push(`images.txt:${n + 1}: kelime iki kez: ${id}`);
  imageMap.set(id, ref);
}
for (const [i, [file, raw]] of lines.entries()) {
  const line = raw.trim();
  if (!line || line.startsWith('#')) continue;
  if (line.startsWith('@')) {
    const [id, en, tr] = line.slice(1).split('|');
    cat = id; if (!categories.some(c => c.id === id)) categories.push({ id, en, tr }); continue;
  }
  const f = line.split('|');
  if (f.length !== 8) { errors.push(`${file}:${i + 1}: ${f.length} alan: ${line}`); continue; }
  const [en, tr, ipa, say, ex, exTr, level, icon] = f.map(s => s.trim());
  const id = en.toLowerCase().replace(/[^a-z]+/g, '-').replace(/^-|-$/g, '');
  if (!/^\/.+\/$/.test(ipa)) errors.push(`${file}:${i + 1}: IPA bozuk: ${ipa}`);
  if (!['A1', 'A2', 'B1'].includes(level)) errors.push(`${file}:${i + 1}: seviye: ${level}`);
  if (seenEn.has(id)) errors.push(`${file}:${i + 1}: tekrar eden kelime: ${en}`);
  seenEn.set(id, 1);
  const trKey = tr.toLocaleLowerCase('tr');
  if (seenTr.has(trKey)) warnings.push(`${file}:${i + 1}: tekrar eden Türkçe anlam: ${tr} (${seenTr.get(trKey)} ve ${en})`);
  seenTr.set(trKey, en);
  if (!ex.toLowerCase().includes(en.toLowerCase().split(' ')[0].slice(0, 3))) warnings.push(`${file}:${i + 1}: örnek cümlede kelime yok? ${en}: ${ex}`);
  let hasIcon = false;
  const ref = imageMap.get(id) ?? (icon !== '-' ? icon : null);
  imageMap.delete(id);
  if (ref) {
    const parts = ref.split('+');
    const key = parts.length > 1 ? ref : (ref.includes(':') ? ref : 'mdi:' + ref);
    const out = compose(parts);
    if (!out) errors.push(`${file}:${i + 1}: ikon yok/uygunsuz: ${ref} (${en})`);
    else if (seenIcon.has(key)) errors.push(`${file}:${i + 1}: ikon tekrar: ${ref} (${seenIcon.get(key)} ve ${en})`);
    else { icons[id] = out; hasIcon = true; seenIcon.set(key, en); }
  }
  words.push({ id, en, tr, ipa, say, ex, exTr, level, cat, img: hasIcon });
}
// data/hints.txt: Türkçe hafıza ipuçları `kelime-id|ipucu`
const hintFile = path.join(root, 'data/hints.txt');
if (fs.existsSync(hintFile)) {
  const byId = new Map(words.map(w => [w.id, w]));
  for (const [n, raw] of fs.readFileSync(hintFile, 'utf8').split('\n').entries()) {
    const l = raw.trim(); if (!l || l.startsWith('#')) continue;
    const k = l.indexOf('|'); const id = l.slice(0, k).trim(), hint = l.slice(k + 1).trim();
    if (k < 0 || !hint) { errors.push(`hints.txt:${n + 1}: bozuk satır`); continue; }
    const w = byId.get(id);
    if (!w) errors.push(`hints.txt:${n + 1}: bilinmeyen kelime: ${id}`);
    else if (w.hint) errors.push(`hints.txt:${n + 1}: iki kez: ${id}`);
    else w.hint = hint;
  }
}
{ // elle yazılmış ipucu yoksa görselsiz kelimeye yapı ipucu (birleşik kelime / ek)
  const byId = new Map(words.map(w => [w.id, w]));
  for (const w of words) if (!w.hint && !w.img) { const h = autoHint(w, byId, EXCLUDE); if (h) w.hint = h; }
}
for (const id of imageMap.keys()) errors.push(`images.txt: bilinmeyen kelime: ${id}`);
if (warnings.length) console.warn('UYARI (' + warnings.length + '):\n' + warnings.join('\n'));
if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
fs.mkdirSync(path.join(root, 'src/data'), { recursive: true });
fs.writeFileSync(path.join(root, 'src/data/words.json'), JSON.stringify({ categories, words }));
fs.writeFileSync(path.join(root, 'src/data/icons.json'), JSON.stringify(icons));
const fam = families(words.map(w => w.id));
fs.writeFileSync(path.join(root, 'src/data/families.json'), JSON.stringify(fam.out));
console.log('İpucu:', words.filter(w => w.hint).length, '(görselsiz:', words.filter(w => w.hint && !w.img).length + ')');
console.log('Kelime aileleri:', fam.groups.length, 'grup,', Object.keys(fam.out).length, 'kelime');
// Yazım denetimi için çevrimdışı İngilizce kelime listesi (SCOWL / wordlist-english, izin metni: public/ikon-lisanslari.txt)
{
  const wl = new Set();
  const dir = path.join(root, 'node_modules/wordlist-english');
  for (const v of ['english', 'american', 'british']) for (const n of [10, 20, 35, 40, 50])
    for (const w of JSON.parse(fs.readFileSync(path.join(dir, `${v}-words-${n}.json`), 'utf8'))) if (/^[a-z]+$/.test(w)) wl.add(w);
  fs.writeFileSync(path.join(root, 'src/data/wordlist.txt'), [...wl].sort().join('\n'));
  console.log('Yazım listesi:', wl.size, 'kelime');
}
const withImg = words.filter(w => w.img).length;
console.log(`OK: ${words.length} kelime, ${categories.length} kategori, ${withImg} görselli, ${words.length - withImg} yedek görselli`);
for (const c of categories) console.log(c.id, words.filter(w => w.cat === c.id).length, 'img', words.filter(w => w.cat === c.id && w.img).length);
