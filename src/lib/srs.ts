import { DAY, dayKey, startOfDay } from './date';

export type QuizMode = 'img-write' | 'en-tr' | 'tr-en' | 'img-choice' | 'listen';
export type Status = 'new' | 'learning' | 'learned' | 'hard';

export interface WordProgress {
  status: Exclude<Status, 'new'>;
  ease: number;        // SM-2 kolaylık katsayısı
  interval: number;    // gün
  reps: number;        // art arda başarılı (zamanlanmış) tekrar sayısı
  due: number;         // bir sonraki tekrar zamanı (ms)
  correct: number;
  wrong: number;
  lapses: number;
  streak: number;      // art arda doğru cevap
  modes: QuizMode[];   // doğru bilinen farklı test türleri
  firstSeen: string;   // YYYY-MM-DD
  seenAt?: number;     // ilk görüldüğü an (gün içindeki sıralama için)
  lastSeen: number;
}

export const MAX_INTERVAL = 120;
export const LEARNED_STREAK = 3;

export function newProgress(now = Date.now()): WordProgress {
  return { status: 'learning', ease: 2.5, interval: 0, reps: 0, due: now, correct: 0, wrong: 0, lapses: 0, streak: 0, modes: [], firstSeen: dayKey(now), lastSeen: now };
}

/**
 * SM-2 benzeri güncelleme.
 * scheduled=false (serbest pratik): doğru cevap tarihi ileri atmaz, yanlış cevap yine kelimeyi öne çeker.
 * requiredModes: kelime için mümkün olan farklı test türü sayısı (en fazla 3 gerekir).
 */
export function grade(p: WordProgress, result: boolean | 'almost', mode: QuizMode, opts: { scheduled: boolean; requiredModes: number; now?: number }): WordProgress {
  const now = opts.now ?? Date.now();
  const q: WordProgress = { ...p, modes: [...p.modes], lastSeen: now };
  const correct = result === true;
  if (result === 'almost') {
    // "neredeyse doğru" (tek harflik yazım hatası): kelime bilinir ama yazımı oturmamış.
    // Seri bozulmaz ama artmaz, test türü "doğru bilinen" sayılmaz, kelime ertesi gün yeniden sorulur.
    q.correct++;
    if (opts.scheduled) {
      q.ease = Math.max(1.3, q.ease - 0.05);
      q.interval = 1;
      q.due = startOfDay(now) + DAY + 4 * 3600000;
    }
  } else if (correct) {
    q.correct++; q.streak++;
    if (opts.scheduled) {
      if (!q.modes.includes(mode)) q.modes.push(mode);
      if (q.reps === 0) q.interval = 1;
      else if (q.reps === 1) q.interval = 3;
      else q.interval = Math.min(MAX_INTERVAL, Math.round(q.interval * q.ease));
      q.ease = Math.min(2.8, q.ease + 0.1);
      q.reps++;
      q.due = startOfDay(now) + q.interval * DAY + 4 * 3600000; // ertesi gün(ler) sabah 04:00
    }
  } else {
    q.wrong++; q.lapses++; q.streak = 0; q.reps = 0; q.interval = 0;
    q.ease = Math.max(1.3, q.ease - 0.2);
    q.due = now + 10 * 60000; // 10 dk sonra tekrar
  }
  const need = Math.min(3, opts.requiredModes);
  if (q.lapses >= 2 && q.streak < 2) q.status = 'hard';
  else if (q.streak >= LEARNED_STREAK && q.modes.length >= need && q.reps >= 2) q.status = 'learned';
  else q.status = 'learning';
  return q;
}

export function isDue(p: WordProgress, now = Date.now()) { return p.due <= now; }
