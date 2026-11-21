// Arayüz dili. Kelime içeriği (İngilizce kelime → Türkçe anlam, ipuçları, örnek çeviriler) her iki dilde de aynı kalır;
// yalnızca menüler, düğmeler, etiketler ve mesajlar çevrilir. Anahtar, metnin Türkçe hâlidir.
import { EN } from './i18n-en';

export type Lang = 'tr' | 'en';
let lang: Lang = 'tr';
export function setLang(l: Lang) {
  lang = l === 'en' ? 'en' : 'tr';
  if (typeof document !== 'undefined') { document.documentElement.lang = lang; document.title = lang === 'en' ? 'My Words' : 'Kelimelerim'; }
}
export function getLang(): Lang { return lang; }
export const locale = () => (lang === 'en' ? 'en-US' : 'tr-TR');

export type Vars = Record<string, string | number>;
export type Entry = string | ((v: Vars) => string);
const fill = (s: string, v?: Vars) => (v ? s.replace(/\{(\w+)\}/g, (m, k) => (k in v ? String(v[k]) : m)) : s);

/** Türkçe metni seçili dile çevirir. `{n}` gibi yer tutucular `vars` ile doldurulur. */
export function t(tr: string, vars?: Vars): string {
  if (lang === 'tr') return fill(tr, vars);
  const e = EN[tr];
  if (e === undefined) {
    if (typeof window !== 'undefined') ((window as unknown as { __i18nMiss?: Set<string> }).__i18nMiss ??= new Set()).add(tr);
    return fill(tr, vars);
  }
  return typeof e === 'function' ? e(vars ?? {}) : fill(e, vars);
}
/** İngilizce çoğul: pl(3, 'word') → "3 words". */
export const pl = (n: number | string, one: string, many = one + 's') => `${n} ${Number(n) === 1 ? one : many}`;
