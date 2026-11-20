import { ALIASES, WORDS, WORD_BY_ID, type Word } from './data';
import { typoDistance } from './spell';
import type { QuizMode } from './srs';

export interface Question { id: string; mode: QuizMode; options?: string[] /* word ids */ }

export const MODE_LABELS: Record<QuizMode, string> = {
  'img-write': 'Görselden yaz',
  'en-tr': 'İngilizce → Türkçe',
  'tr-en': 'Türkçe → İngilizce yaz',
  'img-choice': 'Görselden seç',
  'listen': 'Dinle ve bul',
};

export function shuffle<T>(a: T[]): T[] {
  const b = [...a];
  for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; }
  return b;
}

/** Aynı kategoriden (yetmezse diğerlerinden) 3 çeldirici seçer. */
export function makeOptions(w: Word, needImg: boolean): string[] {
  const ok = (x: Word) => x.id !== w.id && (!needImg || x.img) && x.tr !== w.tr && x.en.toLowerCase() !== w.en.toLowerCase();
  const same = shuffle(WORDS.filter(x => x.cat === w.cat && ok(x)));
  const other = shuffle(WORDS.filter(x => x.cat !== w.cat && ok(x) && x.level === w.level));
  const picks = [...same.slice(0, 2), ...other].slice(0, 3);
  return shuffle([w.id, ...picks.map(x => x.id)]);
}

export function buildQuestion(id: string, mode: QuizMode): Question {
  const w = WORD_BY_ID[id];
  if (mode === 'en-tr' || mode === 'img-choice' || mode === 'listen') return { id, mode, options: makeOptions(w, mode === 'img-choice') };
  return { id, mode };
}

/** Karışık modda: kelimenin henüz doğru bilinmediği türlere öncelik ver, art arda aynı türü kullanma. */
export function pickMode(available: QuizMode[], solved: QuizMode[], last?: QuizMode): QuizMode {
  let pool = available.filter(m => m !== last);
  if (!pool.length) pool = available;
  const fresh = pool.filter(m => !solved.includes(m));
  const from = fresh.length ? fresh : pool;
  return from[Math.floor(Math.random() * from.length)];
}

export function normalize(s: string) { return s.toLowerCase().replace(/[^a-z]/g, ''); }
export type Check = 'correct' | 'typo' | 'wrong';
/** Yazılı cevabı kontrol eder. Uzun kelimelerde 1 (8+ harfte 2) harflik hata "neredeyse doğru" sayılır;
 *  yazılan şey başka bir gerçek kelimeyse (form/from gibi) yanlıştır. */
export function checkTyped(id: string, input: string): Check {
  const w = WORD_BY_ID[id];
  const given = normalize(input.replace(/^(a|an|the|to)\s+/i, ''));
  if (!given) return 'wrong';
  const answers = [w.en, ...(ALIASES[id] ?? [])].map(normalize);
  if (answers.includes(given)) return 'correct';
  if (WORDS.some(x => x.id !== id && normalize(x.en) === given)) return 'wrong';
  const target = normalize(w.en);
  if (target.length >= 4 && typoDistance(given, target, 2) <= (target.length >= 8 ? 2 : 1)) return 'typo';
  return 'wrong';
}
