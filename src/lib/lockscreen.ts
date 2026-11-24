// Kilit ekranı kelimesi: iPhone'da web uygulamaları kilit ekranı widget'ı ekleyemez. Bunun yerine ücretsiz
// Scriptable uygulaması için, öğrenilen kelimeleri içine gömülü hazır bir betik üretilir. Betik tamamen cihazda çalışır,
// internete bağlanmaz; widget her yenilendiğinde öğrenilen kelimelerden birini (zorlanılanlara biraz daha sık) gösterir.
import { capEn, capTr, WORD_BY_ID } from './data';
import type { AppState } from './store';

export function lockWords(s: AppState): [string, string, number][] {
  return Object.entries(s.progress).filter(([id]) => WORD_BY_ID[id])
    .map(([id, p]) => [capEn(WORD_BY_ID[id].en), capTr(WORD_BY_ID[id].tr), p.status === 'hard' ? 3 : p.status === 'learned' ? 1 : 2] as [string, string, number])
    .sort((a, b) => a[0].localeCompare(b[0]));
}

export function buildLockScript(s: AppState, appUrl: string): string {
  const words = lockWords(s);
  const date = new Date().toISOString().slice(0, 10);
  return `// Kelimelerim – kilit ekranı kelimesi (Scriptable)
// ${date} tarihinde ${words.length} öğrenilen kelimeyle oluşturuldu. Yeni kelimeler için uygulamadan kodu yeniden kopyala.
// İnternete bağlanmaz; kelimeler bu dosyanın içindedir. Ağırlık: 3 = zorlanılan, 2 = öğreniliyor, 1 = öğrenildi.
const WORDS = ${JSON.stringify(words)};
const APP = ${JSON.stringify(appUrl)};

function pick() {
  const total = WORDS.reduce((a, w) => a + w[2], 0);
  let r = Math.random() * total;
  for (const w of WORDS) { r -= w[2]; if (r < 0) return w; }
  return WORDS[0];
}
const [en, tr] = WORDS.length ? pick() : ["Kelimelerim", "Önce birkaç kelime öğren"];
const w = new ListWidget();
w.url = APP;
w.refreshAfterDate = new Date(Date.now() + 15 * 60 * 1000);
const fam = config.widgetFamily;
if (fam === "accessoryInline") {
  w.addText(en + " · " + tr);
} else if (fam === "accessoryRectangular" || fam === "accessoryCircular") {
  w.addAccessoryWidgetBackground = true;
  const h = w.addText("KELİMELERİM"); h.font = Font.semiboldSystemFont(10); h.textOpacity = 0.75;
  const a = w.addText(en); a.font = Font.boldRoundedSystemFont(18); a.lineLimit = 1; a.minimumScaleFactor = 0.5;
  const b = w.addText(tr); b.font = Font.mediumSystemFont(13); b.lineLimit = 1; b.minimumScaleFactor = 0.6;
} else {
  const g = new LinearGradient(); g.colors = [new Color("#3b5bdb"), new Color("#7048e8")]; g.locations = [0, 1]; w.backgroundGradient = g;
  const h = w.addText("KELİMELERİM"); h.font = Font.semiboldSystemFont(11); h.textColor = Color.white(); h.textOpacity = 0.8;
  w.addSpacer(6);
  const a = w.addText(en); a.font = Font.boldRoundedSystemFont(26); a.textColor = Color.white(); a.lineLimit = 2; a.minimumScaleFactor = 0.5;
  const b = w.addText(tr); b.font = Font.mediumSystemFont(16); b.textColor = Color.white(); b.lineLimit = 2; b.minimumScaleFactor = 0.6;
}
if (config.runsInWidget) Script.setWidget(w); else await w.presentSmall();
Script.complete();
`;
}
