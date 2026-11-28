// Yeni kelime partisini denetler: node scripts/check-new.mjs data/w41-x.psv [...]
// Alan sayısı, IPA biçimi, seviye, mevcut sözlükle ve partiler arası tekrar, örnek cümlede kelime var mı.
import fs from 'node:fs';
import path from 'node:path';
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const targets = new Set(process.argv.slice(2).map(f => path.resolve(f)));
const files = fs.readdirSync(path.join(root, 'data')).filter(f => f.endsWith('.psv')).sort().map(f => path.join(root, 'data', f));
const slug = en => en.toLowerCase().replace(/[^a-z]+/g, '-').replace(/^-|-$/g, '');
const seen = new Map(); let problems = 0, count = 0;
for (const f of files) {
  const mine = targets.has(f);
  for (const [i, raw] of fs.readFileSync(f, 'utf8').split('\n').entries()) {
    const l = raw.trim(); if (!l || l.startsWith('#') || l.startsWith('@')) continue;
    const p = l.split('|'); const where = `${path.basename(f)}:${i + 1}`;
    const id = slug(p[0]);
    if (mine) {
      count++;
      const bad = [];
      if (p.length !== 8) bad.push(`${p.length} alan`);
      else {
        if (!/^\/.+\/$/.test(p[2])) bad.push('IPA');
        if (!['A1', 'A2', 'B1', 'B2'].includes(p[6])) bad.push('seviye ' + p[6]);
        if (!p[4].toLowerCase().includes(p[0].toLowerCase().split(' ')[0].slice(0, 3))) bad.push('örnekte kelime yok');
        if (!p[1] || !p[3] || !p[5]) bad.push('boş alan');
      }
      if (seen.has(id)) bad.push('TEKRAR (' + seen.get(id) + ')');
      if (bad.length) { problems++; console.log(where, p[0], '→', bad.join(', ')); }
    }
    if (!seen.has(id)) seen.set(id, where);
  }
}
console.log(`${count} satır, ${problems} sorun`);
