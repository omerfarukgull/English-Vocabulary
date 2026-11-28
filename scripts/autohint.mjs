// Otomatik yapı ipuçları: birleşik kelimeler (bus ticket = bus + ticket) ve ekler (un-happy, care-less).
// Yalnızca parçaların kendisi sözlükte varsa üretilir; anlamlar sözlükteki Türkçe karşılıklardan gelir.
const PRE = [['un', 'değil / tersi'], ['dis', 'değil / tersi'], ['im', 'değil'], ['in', 'değil'], ['il', 'değil'], ['ir', 'değil'], ['re', 'yeniden, geri'], ['mis', 'yanlış']];
const SUF = [
  ['iness', 'y', '-ness: sıfattan isim yapar (-lık/-lik)'], ['ness', '', '-ness: sıfattan isim yapar (-lık/-lik)'],
  ['iful', 'y', '-ful: "dolu" (-lı/-li)'], ['ful', '', '-ful: "dolu" (-lı/-li)'], ['less', '', '-less: "-sız/-siz"'],
  ['ily', 'y', 'LY'], ['ly', 'le', 'LY'], ['ly', '', 'LY'],
  ['ment', '', '-ment: fiilden isim yapar'], ['ation', 'e', '-tion: fiilden isim yapar (-ma/-me)'], ['ation', '', '-tion: fiilden isim yapar (-ma/-me)'], ['tion', 'te', '-tion: fiilden isim yapar'], ['sion', 'de', '-sion: fiilden isim yapar'], ['ssion', 'ss', '-sion: fiilden isim yapar'],
  ['er', '', '-er: yapan kişi ya da alet (-cı/-ci)'], ['er', 'e', '-er: yapan kişi ya da alet (-cı/-ci)'], ['ner', '', '-er: yapan kişi'], ['or', '', '-or: yapan kişi ya da alet'], ['or', 'e', '-or: yapan kişi'], ['ist', '', '-ist: o işi yapan kişi'], ['ist', 'y', '-ist: o işi yapan kişi'], ['ian', '', '-ian: o işi yapan kişi'], ['ee', '', '-ee: işi yapılan / çalıştırılan kişi'],
  ['able', '', '-able: "-ebilir / -ilir"'], ['able', 'e', '-able: "-ebilir / -ilir"'], ['ous', '', '-ous: sıfat yapar (-lı)'], ['ive', 'e', '-ive: sıfat yapar'], ['al', '', '-al: sıfat yapar (-sal/-sel)'], ['al', 'e', '-al: sıfat yapar (-sal/-sel)'],
  ['ny', '', '-y: isimden sıfat (-lı/-li)'], ['dy', '', '-y: isimden sıfat (-lı/-li)'], ['gy', '', '-y: isimden sıfat (-lı/-li)'], ['y', '', '-y: isimden sıfat (-lı/-li)'], ['y', 'e', '-y: isimden sıfat (-lı/-li)'],
  ['ence', 'ent', '-ence: sıfattan isim yapar (-lık)'], ['ance', 'ant', '-ance: sıfattan isim yapar (-lık)'], ['ship', '', '-ship: durum / ilişki (-lık)'], ['hood', '', '-hood: dönem / durum (-lık)'], ['ity', '', '-ity: isim yapar (-lık)'], ['ity', 'e', '-ity: isim yapar (-lık)'],
  ['ing', '', 'ING'], ['ing', 'e', 'ING'], ['ed', '', '-ed: "-mış / -lı" sıfat yapar'], ['ied', 'y', '-ed: "-mış / -lı" sıfat yapar'],
];
const TIME = new Set(['day', 'week', 'month', 'year', 'hour']);
// Parçaları yanıltıcı anlam veren kalıplar (ör. question-mark'ta mark "not" değil) elle ipucu alır.
const SKIP = new Set(['question-mark', 'second-hand', 'look-after', 'come-back', 'feel-like', 'look-like', 'get-along', 'get-lost', 'get-married', 'take-care', 'take-part', 'pay-attention', 'have-fun', 'straight-away', 'fitness', 'missing', 'later', 'health', 'safety', 'fixed', 'comfortable', 'wonderful', 'manager', 'stranger', 'replace', 'cheerful', 'sticky', 'skinny']);
const ADV = /(ca|ce|ça|çe|arak|erek|şekilde|olarak|sle|yle|lerde|larda|ken|men|nda|nde|eyse|aki|eki|ki)\b|^(hemen|tam|sadece|gerçekten|kesinlikle|sonunda|maalesef)/;
function suffixText(m, w, base) {
  if (m === 'LY') {
    if (TIME.has(base)) return '-ly: "her … bir" anlamı katar (-lık/-lik)';
    if (w.cat === 'adverbs' || ADV.test(w.tr) && w.cat !== 'adjectives') return '-ly: sıfatı zarf yapar (-ca/-ce, … şekilde)';
    return '-ly: burada isimden sıfat yapar (arkadaş → arkadaşça gibi)';
  }
  if (m === 'ING') {
    if (/(ma|me|ış|iş|uş|üş|lık|lik|luk|lük)\b/.test(w.tr.split(/[,(]/)[0].trim()) || ['meaning', 'feeling', 'painting'].includes(w.id) || ['abstract', 'sports'].includes(w.cat)) return '-ing: eylemin adı (-ma/-me)';
    return '-ing: sıfat yapar (… uyandıran, -ıcı/-ici)';
  }
  // -al / -y / -ing isim yaptığında (approval, discovery, understanding) "sıfat yapar" demesin
  if (w.cat !== 'adjectives' && /^-al:/.test(m) && !/(sal|sel)\b/.test(w.tr)) return '-al: fiilden isim yapar';
  if (w.cat !== 'adjectives' && /^-y:/.test(m) && !/(lı|li|lu|lü)\b/.test(w.tr)) return '-y: isim yapar (-lık)';
  return m;
}
export function autoHint(w, byId, excluded) {
  if (SKIP.has(w.id)) return null;
  const tr = id => byId.get(id)?.tr.split(/[,(]/)[0].trim();
  if (w.id.includes('-')) {
    const parts = w.id.split('-'); const known = parts.map(p => byId.get(p));
    if (known.every(Boolean) && parts.length <= 3) return `Parçalar: ${parts.map(p => `${byId.get(p).en} (${tr(p)})`).join(' + ')} → ${w.tr}`;
    return null;
  }
  for (const [p, m] of PRE) if (w.id.startsWith(p) && byId.has(w.id.slice(p.length)) && !excluded.has(`${w.id}>${w.id.slice(p.length)}`) && w.id.length - p.length >= 3)
    return `${p}- = ${m}: ${p} + ${w.id.slice(p.length)} (${tr(w.id.slice(p.length))}) → ${w.tr}`;
  for (const [s, r, m] of SUF) if (w.id.endsWith(s) && w.id.length - s.length >= 3) {
    const base = w.id.slice(0, -s.length) + r;
    if (byId.has(base) && base !== w.id && !excluded.has(`${w.id}>${base}`)) return `${base} (${tr(base)}) + ${suffixText(m, w, base)} → ${w.tr}`;
  }
  return null;
}
