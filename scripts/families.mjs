// Kelime aileleri: happy / happiness / unhappy gibi aynı kökten türeyen sözlük kelimelerini gruplar.
// Kurallar + elle düzensiz eşleşmeler; yanlış eşleşmeler EXCLUDE ile engellenir. Sonuç elle gözden geçirildi.
const PREFIX = ['un', 'dis', 'in', 'im', 'ir', 'il', 're', 'mis', 'non'];
const SUFFIX = [
  ['iness', 'y'], ['ness', ''], ['iful', 'y'], ['ful', ''], ['less', ''], ['ily', 'y'], ['ably', 'able'], ['ibly', 'ible'], ['ly', 'le'], ['ly', ''],
  ['ment', ''], ['ation', 'e'], ['ation', ''], ['ition', 'e'], ['tion', 'te'], ['tion', 'ce'], ['tion', ''], ['sion', 'de'], ['sion', 'se'], ['ssion', 'ss'],
  ['er', ''], ['er', 'e'], ['ner', ''], ['ger', ''], ['mer', ''], ['ter', ''], ['ber', ''], ['ver', ''], ['ier', 'y'], ['or', ''], ['or', 'e'], ['ist', ''], ['ist', 'y'], ['ian', ''], ['ess', ''],
  ['able', ''], ['able', 'e'], ['ible', ''], ['ous', ''], ['ous', 'e'], ['ive', 'e'], ['ive', ''], ['al', ''], ['al', 'e'], ['ical', 'y'],
  ['ny', ''], ['ty', ''], ['dy', ''], ['gy', ''], ['y', ''], ['y', 'e'], ['ing', ''], ['ing', 'e'], ['ed', ''], ['ed', 'e'], ['ied', 'y'], ['ence', 'ent'], ['ance', 'ant'],
  ['ship', ''], ['hood', ''], ['th', ''], ['ity', ''], ['ity', 'e'], ['ility', 'le'], ['ic', ''], ['ish', ''], ['ee', ''],
];
export const IRREGULAR = [
  // Zamir takımları: kişi → nesne → iyelik → iyelik zamiri → dönüşlü
  ['i', 'me', 'my', 'mine', 'myself'], ['you', 'your', 'yours', 'yourself', 'yourselves'], ['he', 'him', 'his', 'himself'],
  ['she', 'her', 'hers', 'herself'], ['it', 'its', 'itself'], ['we', 'us', 'our', 'ours', 'ourselves'], ['they', 'them', 'their', 'theirs', 'themselves'],
  ['who', 'whom', 'whose', 'whoever'], ['which', 'whichever'], ['what', 'whatever'], ['this', 'these'], ['that', 'those'],
  ['other', 'others', 'another'], ['someone', 'somebody', 'something'], ['anyone', 'anybody', 'anything'], ['everyone', 'everybody', 'everything'], ['no-one', 'nobody', 'nothing', 'none'],
  ['strong', 'strength'], ['die', 'dead', 'death'], ['high', 'height'], ['long', 'length'], ['wide', 'width'], ['true', 'truth'],
  ['succeed', 'success', 'successful'], ['choose', 'choice'], ['believe', 'belief'], ['prove', 'proof'], ['speak', 'speech'], ['sell', 'sale'],
  ['live', 'life', 'alive'], ['lose', 'loss', 'lost'], ['think', 'thought'], ['fly', 'flight'], ['decide', 'decision'], ['explain', 'explanation'],
  ['good', 'better', 'best'], ['bad', 'worse', 'worst'], ['hot', 'heat'], ['young', 'youth'], ['proud', 'pride'], ['wise', 'wisdom'], ['free', 'freedom'],
  ['bored', 'boring'], ['excited', 'exciting', 'excitement'], ['interest', 'interested', 'interesting'],
  ['marry', 'married', 'marriage'], ['fly', 'flight'], ['child', 'childhood'], ['friend', 'friendly', 'friendship'],
  ['danger', 'dangerous'], ['fun', 'funny'], ['sun', 'sunny', 'sunshine', 'sunrise', 'sunset'], ['rain', 'rainy', 'raincoat'], ['snow', 'snowy'],
  ['cloud', 'cloudy'], ['wind', 'windy'], ['fog', 'foggy'], ['storm', 'stormy'], ['ice', 'icy'], ['health', 'healthy'], ['wealth', 'wealthy'],
  ['luck', 'lucky', 'luckily'], ['hunger', 'hungry'], ['thirst', 'thirsty'], ['anger', 'angry'], ['able', 'ability', 'unable'],
];
// kural sonucu çıkan ama gerçekte ilgisiz eşleşmeler (gözden geçirmede bulundu)
export const EXCLUDE = new Set('young>you youth>you bother>both many>man hardly>hard evening>even shower>show farmer>far remember>member busy>bus discount>count tooth>too discover>cover improve>prove matter>mat repair>pair return>turn remind>mind remove>move report>port retire>tire better>bet early>ear ready>read story>store topic>top windy>win ruler>rule mistake>take letter>let research>search corner>corn winter>win comedy>come poster>post army>arm tradition>trade partner>part inside>side butter>but drawer>draw earth>ear plumber>plum career>care business>busy folder>fold sweater>sweat final>fine former>form missing>sing tiny>tin apply>apple apply>app react>act review>view image>age manner>man legal>leg indoor>door mayor>may tired>tire boxing>box active>act engineer>engine recover>cover inform>form island>is reason>son rest>re party>part carpet>car restaurant>rest'.split(' '));
export function families(ids, extraGroups = []) {
  const has = new Set(ids);
  const parent = new Map(ids.map(i => [i, i]));
  const find = x => { while (parent.get(x) !== x) { parent.set(x, parent.get(parent.get(x))); x = parent.get(x); } return x; };
  const link = (a, b, why) => { if (!has.has(a) || !has.has(b) || a === b || EXCLUDE.has(`${a}>${b}`)) return; parent.set(find(a), find(b)); links.push(`${a}>${b} (${why})`); };
  const links = [];
  for (const id of ids) {
    if (id.includes('-')) continue;
    for (const p of PREFIX) if (id.startsWith(p) && id.length - p.length >= 3) link(id, id.slice(p.length), p + '-');
    for (const [suf, rep] of SUFFIX) if (id.endsWith(suf) && id.length - suf.length >= 3) link(id, id.slice(0, -suf.length) + rep, '-' + suf);
  }
  for (const g of [...IRREGULAR, ...extraGroups]) for (let i = 1; i < g.length; i++) link(g[i], g[0], 'düzensiz');
  const groups = new Map();
  for (const id of ids) { const r = find(id); if (!groups.has(r)) groups.set(r, []); groups.get(r).push(id); }
  const out = {};
  for (const g of groups.values()) if (g.length > 1) for (const id of g) out[id] = g.filter(x => x !== id);
  return { out, links, groups: [...groups.values()].filter(g => g.length > 1) };
}
