import { get, set } from 'idb-keyval';
import { useSyncExternalStore } from 'react';
import { BUILTIN_BY_EN, CUSTOM_CAT, registerCustomWords, WORDS, WORD_BY_ID, type Level, type Word } from './data';
import { dayKey } from './date';
import { grade, newProgress, type QuizMode, type WordProgress } from './srs';
import { speechSupported } from './speech';
import { setLang, t, type Lang } from './i18n';

export interface DayLog { newWords: number; reviews: number; correct: number; wrong: number; testDone?: boolean }
export interface Settings {
  theme: 'system' | 'light' | 'dark';
  rate: number;
  voice?: string;
  autoplay: boolean;
  dailyGoal: number;
  levelPref: 'A2' | 'A1' | 'B1' | 'mixed';
  reminder: { on: boolean; time: string }; // günlük hatırlatma saati "HH:MM"
  focusCat: string; // '' = tüm kategoriler; aksi halde yeni kelimeler yalnızca bu kategoriden gelir
  lang: Lang; // arayüz dili (kelime içeriği her zaman İngilizce → Türkçe)
}
export interface AppState {
  version: 1;
  progress: Record<string, WordProgress>;
  favorites: string[];
  days: Record<string, DayLog>;
  plan: { date: string; ids: string[] };
  settings: Settings;
  custom: Word[]; // kullanıcının eklediği kelimeler
}

const KEY = 'pev-state-v1';
export const DEFAULT_SETTINGS: Settings = { theme: 'system', rate: 0.9, autoplay: true, dailyGoal: 10, levelPref: 'A2', reminder: { on: false, time: '20:00' }, focusCat: '', lang: 'tr' };
export function emptyState(): AppState {
  return { version: 1, progress: {}, favorites: [], days: {}, plan: { date: '', ids: [] }, settings: { ...DEFAULT_SETTINGS }, custom: [] };
}

let state: AppState = emptyState();
let loaded = false;
const subs = new Set<() => void>();
let saveTimer: number | undefined;

function emit() { setLang(state.settings.lang); subs.forEach(f => f()); }
function persist() {
  clearTimeout(saveTimer);
  saveTimer = window.setTimeout(() => {
    set(KEY, state).catch(() => { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* yok */ } });
  }, 150);
}
/** Sayfa kapanırken bekleyen kaydı hemen yaz. */
export function flush() { if (saveTimer) { clearTimeout(saveTimer); saveTimer = undefined; set(KEY, state).catch(() => {}); } }

export function normalizeState(s: unknown): AppState {
  const base = emptyState();
  if (!s || typeof s !== 'object') throw new Error(t('Geçersiz veri'));
  const o = s as Partial<AppState>;
  if (typeof o.progress !== 'object' || o.progress === null) throw new Error(t('İlerleme verisi bulunamadı'));
  const custom: Word[] = [];
  for (const c of Array.isArray(o.custom) ? o.custom : []) {
    if (!c || typeof c.en !== 'string' || typeof c.tr !== 'string' || !c.en.trim() || !c.tr.trim()) continue;
    const w = makeCustomWord(c.en, c.tr, c);
    if (!custom.some(x => x.id === w.id) && !BUILTIN_BY_EN[w.en.toLowerCase()]) custom.push(w);
  }
  registerCustomWords(custom);
  const progress: Record<string, WordProgress> = {};
  for (const [id, p] of Object.entries(o.progress)) {
    if (!WORD_BY_ID[id] || !p || typeof p !== 'object') continue; // bilinmeyen kelimeyi atla
    progress[id] = { ...newProgress(), ...(p as WordProgress) };
  }
  return {
    version: 1,
    progress,
    favorites: Array.isArray(o.favorites) ? o.favorites.filter(id => WORD_BY_ID[id]) : [],
    days: o.days && typeof o.days === 'object' ? o.days : {},
    plan: o.plan && Array.isArray(o.plan.ids) ? { date: String(o.plan.date), ids: o.plan.ids.filter(id => WORD_BY_ID[id]) } : base.plan,
    settings: { ...DEFAULT_SETTINGS, ...(o.settings ?? {}), reminder: { ...DEFAULT_SETTINGS.reminder, ...(o.settings?.reminder ?? {}) }, focusCat: typeof o.settings?.focusCat === 'string' && WORDS.some(w => w.cat === o.settings!.focusCat) ? o.settings.focusCat : '', lang: o.settings?.lang === 'en' ? 'en' : 'tr' },
    custom,
  };
}

export async function loadState() {
  try {
    let s = await get(KEY);
    if (!s) { const ls = localStorage.getItem(KEY); if (ls) s = JSON.parse(ls); }
    if (s) state = normalizeState(s);
  } catch (e) { console.error('Durum yüklenemedi', e); }
  loaded = true;
  try { await navigator.storage?.persist?.(); } catch { /* opsiyonel */ }
  emit();
}

function update(fn: (s: AppState) => AppState) { state = fn(state); emit(); persist(); }

export function useApp(): AppState { return useSyncExternalStore(cb => { subs.add(cb); return () => subs.delete(cb); }, () => state); }
export function isLoaded() { return loaded; }
export function getState() { return state; }

// ---------- günlük kayıt ----------
function bumpDay(s: AppState, patch: (d: DayLog) => DayLog): AppState {
  const k = dayKey();
  const d = s.days[k] ?? { newWords: 0, reviews: 0, correct: 0, wrong: 0 };
  return { ...s, days: { ...s.days, [k]: patch(d) } };
}

// ---------- yeni kelime planı ----------
const LEVEL_ORDER: Record<Settings['levelPref'], Level[]> = { A2: ['A2', 'A1', 'B1'], A1: ['A1', 'A2', 'B1'], B1: ['B1', 'A2', 'A1'], mixed: ['A1', 'A2', 'B1'] };

/** Henüz görülmemiş kelimeleri seviye tercihine göre, kategorileri karıştırarak sıralar. */
export function unseenOrdered(s: AppState): string[] {
  const fc = s.settings.focusCat;
  const all = WORDS.filter(w => !s.progress[w.id] && !s.plan.ids.includes(w.id) && (!fc || w.cat === fc));
  const mine = all.filter(w => w.custom).map(w => w.id); // kendi eklediğin kelimeler önce gelir
  const unseen = all.filter(w => !w.custom);
  const order = LEVEL_ORDER[s.settings.levelPref];
  const groups = s.settings.levelPref === 'mixed' ? [unseen] : order.map(l => unseen.filter(w => w.level === l));
  const out: string[] = [...mine];
  for (const g of groups) {
    const byCat = new Map<string, string[]>();
    for (const w of [...g].sort((a, b) => Number(b.img) - Number(a.img))) { if (!byCat.has(w.cat)) byCat.set(w.cat, []); byCat.get(w.cat)!.push(w.id); }
    const lists = [...byCat.values()];
    for (let i = 0; lists.some(l => l.length); i = (i + 1) % lists.length) { const x = lists[i].shift(); if (x) out.push(x); }
  }
  return out;
}

/** Bugünün planını garanti eder (gün değiştiyse yeni 10 kelime seçer). */
export function ensurePlan() {
  const today = dayKey();
  if (state.plan.date === today) return;
  update(s => {
    const goal = s.settings.dailyGoal;
    const carry: string[] = [];
    const base = { ...s, plan: { date: today, ids: carry } };
    const doneToday = Object.values(s.progress).filter(p => p.firstSeen === today).length;
    const ids = unseenOrdered(base).slice(0, Math.max(0, goal - doneToday));
    return { ...s, plan: { date: today, ids } };
  });
}
/** Çalışılan kategoriyi değiştirir; bugünün planındaki henüz görülmemiş kelimeler yeni kategoriden yeniden seçilir. */
export function setFocusCat(cat: string) {
  update(s => {
    const s1 = { ...s, settings: { ...s.settings, focusCat: cat } };
    const today = dayKey();
    if (s1.plan.date !== today) return s1;
    const seenIds = s1.plan.ids.filter(id => s1.progress[id] !== undefined);
    const base = { ...s1, plan: { date: today, ids: seenIds } };
    const doneToday = Object.values(s1.progress).filter(p => p.firstSeen === today).length;
    const fresh = unseenOrdered(base).slice(0, Math.max(0, s1.settings.dailyGoal - doneToday));
    return { ...s1, plan: { date: today, ids: [...seenIds, ...fresh] } };
  });
}
export function extendPlan(n: number) {
  update(s => ({ ...s, plan: { date: s.plan.date, ids: [...s.plan.ids, ...unseenOrdered(s).slice(0, n)] } }));
}
export function addToPlan(id: string) {
  // "Şimdi öğren": kelime, görülmemişlerin en önüne alınır (öğren ekranı ilk görülmemiş kelimeyi açar).
  update(s => {
    const rest = s.plan.ids.filter(x => x !== id);
    return { ...s, plan: { date: s.plan.date, ids: [...rest.filter(x => s.progress[x] !== undefined), id, ...rest.filter(x => s.progress[x] === undefined)] } };
  });
}

/** Öğrenme kartı geçildiğinde kelime "öğreniliyor" durumuna geçer ve bugünün yeni kelimesi sayılır. */
export function markSeen(id: string) {
  update(s => {
    if (s.progress[id]) return s;
    const s2 = { ...s, progress: { ...s.progress, [id]: { ...newProgress(), seenAt: Date.now() } } };
    return bumpDay(s2, d => ({ ...d, newWords: d.newWords + 1 }));
  });
}

export function availableModes(id: string): QuizMode[] {
  const w = WORD_BY_ID[id];
  const m: QuizMode[] = ['en-tr', 'tr-en'];
  if (w.img) m.push('img-write', 'img-choice');
  if (speechSupported) m.push('listen');
  return m;
}

export function recordAnswer(id: string, result: boolean | 'almost', mode: QuizMode, scheduled: boolean) {
  const correct = result !== false;
  update(s => {
    const p = s.progress[id] ?? newProgress();
    const isNew = !s.progress[id];
    // aynı test türleri İngilizce yazma ile görselli yazma tek "yazma" ailesi sayılmaz; her biri ayrı tür
    const q = grade(p, result, mode, { scheduled, requiredModes: new Set(availableModes(id)).size });
    let s2: AppState = { ...s, progress: { ...s.progress, [id]: q } };
    s2 = bumpDay(s2, d => ({ ...d, reviews: d.reviews + 1, correct: d.correct + (correct ? 1 : 0), wrong: d.wrong + (correct ? 0 : 1), newWords: d.newWords + (isNew ? 1 : 0) }));
    return s2;
  });
}
export function markTestDone() { update(s => bumpDay(s, d => ({ ...d, testDone: true }))); }

export function toggleFavorite(id: string) {
  update(s => ({ ...s, favorites: s.favorites.includes(id) ? s.favorites.filter(x => x !== id) : [...s.favorites, id] }));
}
export function setSettings(patch: Partial<Settings>) {
  update(s => {
    const next = { ...s, settings: { ...s.settings, ...patch } };
    if (patch.levelPref && patch.levelPref !== s.settings.levelPref) {
      // bugünün başlanmamış plan kelimelerini yeni tercihe göre yeniden seç
      const seen = s.plan.ids.filter(id => s.progress[id]);
      const tmp = { ...next, plan: { date: s.plan.date, ids: seen } };
      const remaining = s.plan.ids.length - seen.length;
      return { ...tmp, plan: { date: s.plan.date, ids: [...seen, ...unseenOrdered(tmp).slice(0, remaining)] } };
    }
    if (patch.dailyGoal && patch.dailyGoal !== s.settings.dailyGoal) {
      const today = dayKey();
      const seenToday = Object.values(s.progress).filter(p => p.firstSeen === today).length;
      const planSeen = s.plan.ids.filter(id => s.progress[id]);
      const tmp = { ...next, plan: { date: s.plan.date, ids: planSeen } };
      const need = Math.max(0, patch.dailyGoal - seenToday);
      const unseenInPlan = s.plan.ids.filter(id => !s.progress[id]).slice(0, need);
      const more = unseenOrdered({ ...tmp, plan: { date: s.plan.date, ids: [...planSeen, ...unseenInPlan] } }).slice(0, need - unseenInPlan.length);
      return { ...tmp, plan: { date: s.plan.date, ids: [...planSeen, ...unseenInPlan, ...more] } };
    }
    return next;
  });
}
export function replaceState(s: AppState) { registerCustomWords(s.custom); update(() => s); }
export function resetAll() { update(s => ({ ...emptyState(), settings: s.settings, custom: s.custom })); }

// ---------- kullanıcı kelimeleri ----------
export function slugOf(en: string) { return en.toLowerCase().replace(/[^a-z]+/g, '-').replace(/^-|-$/g, ''); }
export function makeCustomWord(en: string, tr: string, extra: Partial<Word> = {}): Word {
  const e = en.trim().replace(/\s+/g, ' ');
  const level = (['A1', 'A2', 'B1'] as const).includes(extra.level as Level) ? extra.level as Level : 'A2';
  return { id: 'my-' + slugOf(e), en: e, tr: tr.trim(), ipa: '', say: (extra.say ?? '').trim(), ex: (extra.ex ?? '').trim(), exTr: (extra.exTr ?? '').trim(), level, cat: CUSTOM_CAT, img: false, custom: true };
}
/** Yeni kelime ekler; aynı kelime zaten varsa (sözlükte veya senin listende) eklemez ve onu döndürür. */
export function addCustomWord(w: Word): { added: boolean; word: Word } {
  const existing = BUILTIN_BY_EN[w.en.toLowerCase()] ?? WORDS.find(x => x.en.toLowerCase() === w.en.toLowerCase());
  if (existing) return { added: false, word: existing };
  update(s => { const custom = [...s.custom, w]; registerCustomWords(custom); return { ...s, custom }; });
  return { added: true, word: WORD_BY_ID[w.id] };
}
/** Kullanıcı kelimesini düzenler. İngilizce yazım değişirse ilerleme yeni kimliğe taşınır. */
export function updateCustomWord(id: string, en: string, tr: string, extra: Partial<Word>): Word | null {
  const w = makeCustomWord(en, tr, extra);
  const clash = WORDS.find(x => x.id !== id && (x.id === w.id || x.en.toLowerCase() === w.en.toLowerCase()));
  if (clash) return clash;
  update(s => {
    const custom = s.custom.map(x => x.id === id ? w : x); registerCustomWords(custom);
    if (w.id === id) return { ...s, custom };
    const progress = { ...s.progress }; if (progress[id]) { progress[w.id] = progress[id]; delete progress[id]; }
    const ren = (x: string) => x === id ? w.id : x;
    return { ...s, custom, progress, favorites: s.favorites.map(ren), plan: { ...s.plan, ids: s.plan.ids.map(ren) } };
  });
  return null;
}
export function deleteCustomWord(id: string) {
  update(s => {
    const custom = s.custom.filter(w => w.id !== id); registerCustomWords(custom);
    const progress = { ...s.progress }; delete progress[id];
    return { ...s, custom, progress, favorites: s.favorites.filter(x => x !== id), plan: { ...s.plan, ids: s.plan.ids.filter(x => x !== id) } };
  });
}

// ---------- türetilmiş değerler ----------
export function todayNewCount(s: AppState) { const t = dayKey(); return Object.values(s.progress).filter(p => p.firstSeen === t).length; }
export function dueIds(s: AppState, now = Date.now()) {
  return Object.entries(s.progress).filter(([, p]) => p.due <= now)
    .sort((a, b) => (a[1].status === 'hard' ? 0 : 1) - (b[1].status === 'hard' ? 0 : 1) || a[1].due - b[1].due).map(([id]) => id);
}
export function streak(s: AppState): { current: number; best: number } {
  const active = (k: string) => { const d = s.days[k]; return !!d && (d.newWords > 0 || d.reviews > 0); };
  const keys = Object.keys(s.days).filter(active).sort();
  let best = 0, run = 0, prev = '';
  for (const k of keys) {
    const [y, m, d] = prev ? prev.split('-').map(Number) : [0, 0, 0];
    const next = prev ? dayKey(new Date(y, m - 1, d + 1, 12).getTime()) : '';
    run = prev && k === next ? run + 1 : 1; best = Math.max(best, run); prev = k;
  }
  let current = 0;
  const now = new Date();
  let cur = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12);
  if (!active(dayKey(cur.getTime()))) cur = new Date(cur.getTime() - 86400000); // bugün henüz çalışılmadıysa seri dünden devam eder
  while (active(dayKey(cur.getTime()))) { current++; cur = new Date(cur.getTime() - 86400000); }
  return { current, best: Math.max(best, current) };
}

/** Öğrenilen kelimeler günlere göre: 1. Gün en eski gün. Gün içindeki sıra öğrenilme sırasıdır. */
export interface LearnedDay { date: string; n: number; ids: string[] }
export function learnedDays(s: AppState): LearnedDay[] {
  const by = new Map<string, string[]>();
  for (const [id, p] of Object.entries(s.progress)) { if (!by.has(p.firstSeen)) by.set(p.firstSeen, []); by.get(p.firstSeen)!.push(id); }
  const order = new Map(WORDS.map((w, i) => [w.id, i]));
  const key = (id: string) => s.progress[id].seenAt ?? Number.MAX_SAFE_INTEGER;
  return [...by.keys()].sort().map((date, i) => ({
    date, n: i + 1,
    ids: by.get(date)!.sort((a, b) => key(a) - key(b) || (order.get(a) ?? 0) - (order.get(b) ?? 0)),
  }));
}
