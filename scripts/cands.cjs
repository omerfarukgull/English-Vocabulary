// node scripts/cands.cjs <cat> : lists missing-image words of a category with icon-name candidates
const idx = require('./icon-index.cjs');
const { words } = require('../src/data/words.json'); const icons = require('../src/data/icons.json');
const code = { mdi: 'm', ms: 's', gi: 'g', hi: 'h' };
const tok = new Map();
for (const i of idx) for (const n of [i.name, ...i.alias]) for (const t of n.split('-')) { if (!tok.has(t)) tok.set(t, new Set()); tok.get(t).add(code[i.set] + ':' + i.name); }
const stem = s => [s, s.replace(/ies$/, 'y'), s.replace(/s$/, ''), s.replace(/es$/, ''), s.replace(/ing$/, ''), s.replace(/ed$/, ''), s.replace(/e$/, '')];
const cat = process.argv[2];
const miss = words.filter(w => !icons[w.id] && (!cat || w.cat === cat));
for (const w of miss) {
  const parts = w.id.split('-');
  const keys = new Set(parts.length > 1 ? [w.id.replace(/-/g, ''), ...parts.filter(p => p.length > 2)] : stem(w.id));
  let c = [];
  for (const k of keys) for (const n of (tok.get(k) || [])) c.push(n);
  c = [...new Set(c)].filter(n => !/(off|outline|plus|minus|remove|check|alert|cancel|lock|sync|edit|search|cog|settings|clock|star|heart|marker|network|arrow|box|circle|multiple|variant|account)$/.test(n) ).sort((a, b) => a.length - b.length).slice(0, 7);
  console.log(w.id + ': ' + c.map(x => x.replace(/^([msgh]):/, '$1')).join(' '));
}
