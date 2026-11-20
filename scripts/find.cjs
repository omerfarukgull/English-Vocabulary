// node scripts/find.cjs term... : icon refs whose name contains the term (word-boundary first)
const idx = require('./icon-index.cjs');
for (const t of process.argv.slice(2)) {
  const re = new RegExp('(^|-)' + t + '(-|$)'), sub = idx.filter(i => i.name.includes(t) || i.alias.some(a => a.includes(t)));
  const r = [...sub.filter(i => re.test(i.name)), ...sub.filter(i => !re.test(i.name))].sort((a, b) => (re.test(b.name) - re.test(a.name)) || a.name.length - b.name.length);
  console.log(t + ': ' + r.slice(0, 14).map(i => i.ref).join(' '));
}
