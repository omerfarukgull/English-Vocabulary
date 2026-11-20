// Builds a searchable index of the open-licensed icon sets used for word pictures.
// ref = the string to put in data/images.txt (set:name)
const root = require('path').resolve(__dirname, '..');
const idx = [];
const solid = b => !/stroke|fill="(?!currentColor)/.test(b);
for (const m of require(root + '/node_modules/@mdi/svg/meta.json')) if (!m.deprecated) idx.push({ ref: 'mdi:' + m.name, name: m.name, alias: m.aliases || [] });
const add = (set, pkg, filter, clean = n => n) => {
  const j = require(root + '/node_modules/@iconify-json/' + pkg + '/icons.json');
  for (const [n, v] of Object.entries(j.icons)) if (filter(n) && solid(v.body)) idx.push({ ref: set + ':' + n, name: clean(n), alias: [] });
};
add('ms', 'material-symbols', n => !/-(outline|rounded|sharp)(-|$)/.test(n));
add('gi', 'game-icons', () => true);
add('hi', 'healthicons', n => !/-(outline|negative)(-|$)/.test(n));
add('ph', 'ph', n => n.endsWith('-fill'), n => n.replace(/-fill$/, ''));
add('fa', 'fa6-solid', () => true);
add('mc', 'mingcute', n => n.endsWith('-fill'), n => n.replace(/-fill$/, ''));
add('fl', 'fluent', n => n.endsWith('-24-filled'), n => n.replace(/-24-filled$/, ''));
module.exports = idx;
if (require.main === module) console.log(idx.length);
