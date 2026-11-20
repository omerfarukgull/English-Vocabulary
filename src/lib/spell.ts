// Yazım denetimi: tamamen çevrimdışı. Uygulama sözlüğü + ~60.000 kelimelik İngilizce kelime listesi (SCOWL).
import { ALIASES, BUILTIN, WORDS, type Word } from './data';

/** Damerau-Levenshtein (yan yana iki harfin yer değiştirmesi 1 hata). max'tan büyükse max+1 döner (erken çıkış). */
export function typoDistance(a: string, b: string, max = 3): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  const m = a.length, n = b.length;
  let prev2: number[] = [], prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const cur = [i]; let rowMin = i;
    for (let j = 1; j <= n; j++) {
      let v = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) v = Math.min(v, prev2[j - 2] + 1);
      cur.push(v); if (v < rowMin) rowMin = v;
    }
    if (rowMin > max) return max + 1;
    prev2 = prev; prev = cur;
  }
  return prev[n];
}

let dict: Set<string> | null = null;
let byLen: Map<number, string[]> | null = null;
/** Büyük kelime listesini ilk ihtiyaçta yükler (ayrı dosya, çevrimdışı önbellekte). */
export async function loadDictionary(): Promise<Set<string>> {
  if (dict) return dict;
  const mod = await import('../data/wordlist.txt?raw');
  const words = mod.default.split('\n').filter(Boolean);
  for (const w of WORDS) for (const t of w.en.toLowerCase().split(/[^a-z]+/)) if (t) words.push(t);
  dict = new Set(words);
  byLen = new Map();
  for (const w of dict) { const l = w.length; if (!byLen.has(l)) byLen.set(l, []); byLen.get(l)!.push(w); }
  return dict;
}
export function dictionaryReady() { return !!dict; }

const clean = (s: string) => s.toLowerCase().trim().replace(/\s+/g, ' ');

export interface Lookup {
  exact?: Word;            // uygulamada zaten var (veya eş yazımı)
  near: Word[];            // uygulamadaki çok benzer kelimeler (Bunu mu demek istediniz?)
  known: boolean;          // her parçası İngilizce kelime listesinde var mı
  unknownParts: string[];  // listede bulunmayan parçalar
  suggestions: string[];   // listede bulunmayan kelime için en yakın doğru yazımlar
}

function maxDist(len: number) { return len >= 8 ? 2 : len >= 3 ? 1 : 0; }

export function lookup(input: string): Lookup {
  const q = clean(input);
  const flat = q.replace(/[^a-z]/g, '');
  const res: Lookup = { near: [], known: true, unknownParts: [], suggestions: [] };
  if (!flat) return res;
  res.exact = WORDS.find(w => w.en.toLowerCase() === q || w.en.toLowerCase().replace(/[^a-z]/g, '') === flat)
    ?? BUILTIN.find(w => (ALIASES[w.id] ?? []).some(a => a.replace(/[^a-z]/g, '') === flat));
  if (!res.exact) {
    res.near = WORDS.map(w => ({ w, d: typoDistance(flat, w.en.toLowerCase().replace(/[^a-z]/g, ''), 2) }))
      .filter(x => x.d <= Math.max(1, maxDist(flat.length))).sort((a, b) => a.d - b.d).slice(0, 3).map(x => x.w);
  }
  if (dict) {
    const parts = q.split(/[^a-z']+/).filter(Boolean);
    res.unknownParts = parts.filter(p => !dict!.has(p) && !dict!.has(p.replace(/'s$/, '')));
    res.known = res.unknownParts.length === 0;
    if (!res.known && res.unknownParts.length === 1) res.suggestions = suggest(res.unknownParts[0], 4).map(s => q.replace(res.unknownParts[0], s));
  }
  return res;
}

/** Listede en yakın yazımlar (en çok 2 harf fark). */
export function suggest(word: string, n = 4): string[] {
  if (!byLen) return [];
  const out: { w: string; d: number }[] = [];
  const lim = Math.max(1, maxDist(word.length));
  for (let l = word.length - lim; l <= word.length + lim; l++) for (const c of byLen.get(l) ?? []) {
    const d = typoDistance(word, c, lim);
    if (d <= lim) out.push({ w: c, d: d - (c[0] === word[0] ? 0.3 : 0) - (c.length === word.length ? 0.1 : 0) });
  }
  return out.sort((a, b) => a.d - b.d).slice(0, n).map(x => x.w);
}
