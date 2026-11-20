import raw from '../data/words.json';
import iconPaths from '../data/icons.json';
import families from '../data/families.json';

export type Level = 'A1' | 'A2' | 'B1';
export interface Word {
  id: string; en: string; tr: string; ipa: string; say: string;
  ex: string; exTr: string; level: Level; cat: string; img: boolean;
  custom?: boolean; // kullanıcının eklediği kelime
  hint?: string;    // Türkçe hafıza ipucu
}
export interface Category { id: string; en: string; tr: string }

export const CUSTOM_CAT = 'custom';
export const CATEGORIES: Category[] = [...raw.categories, { id: CUSTOM_CAT, en: 'My words', tr: 'Kendi kelimelerim' }];
/** Sözlük + kullanıcı kelimeleri. Kullanıcı kelimeleri registerCustomWords ile yerinde eklenir/çıkarılır. */
export const BUILTIN: Word[] = raw.words as Word[];
export const WORDS: Word[] = [...BUILTIN];
export const WORD_BY_ID: Record<string, Word> = Object.fromEntries(WORDS.map(w => [w.id, w]));
export const BUILTIN_BY_EN: Record<string, Word> = Object.fromEntries(BUILTIN.map(w => [w.en.toLowerCase(), w]));

export function registerCustomWords(list: Word[]) {
  for (let i = WORDS.length - 1; i >= 0; i--) if (WORDS[i].custom) { delete WORD_BY_ID[WORDS[i].id]; WORDS.splice(i, 1); }
  for (const w of list) { if (WORD_BY_ID[w.id]) continue; const x = { ...w, custom: true, cat: CUSTOM_CAT, img: false }; WORDS.push(x); WORD_BY_ID[x.id] = x; }
}
export const CAT_BY_ID: Record<string, Category> = Object.fromEntries(CATEGORIES.map(c => [c.id, c]));
export const ICONS: Record<string, string> = iconPaths;
/** Aynı kökten kelimeler (happy → unhappy, happiness). */
export const FAMILIES: Record<string, string[]> = families;

/** Kabul edilen alternatif yazımlar (İngilizce yazma testlerinde). */
export const ALIASES: Record<string, string[]> = {
  plane: ['airplane', 'aeroplane'], subway: ['metro', 'underground'], trousers: ['pants'],
  garbage: ['trash', 'rubbish'], sneakers: ['trainers'], cookie: ['biscuit'], candy: ['sweets', 'sweet'],
  'gas-station': ['petrol station'], parking: ['car park', 'parking lot'], mother: ['mom', 'mum'],
  father: ['dad'], holiday: ['vacation'], neighbor: ['neighbour'], shop: ['store'], fridge: ['refrigerator'],
  phone: ['mobile phone', 'cellphone', 'mobile'], television: ['tv'], 'washing-machine': ['washer'],
  'police-officer': ['policeman', 'police'], bicycle: ['bike'], motorcycle: ['motorbike'], sofa: ['couch'],
  pajamas: ['pyjamas'], 't-shirt': ['tshirt', 'tee shirt'], 'light-bulb': ['bulb', 'lightbulb'], mall: ['shopping mall', 'shopping centre', 'shopping center'],
  'ice-cream': ['icecream'], 'remote-control': ['remote'], chicken: ['chicken meat'], grapes: ['grape'], shoes: ['shoe'], boots: ['boot'], socks: ['sock'], gloves: ['glove'], scissors: ['scissor'],
};
