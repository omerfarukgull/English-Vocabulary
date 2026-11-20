export const speechSupported = typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;

let voices: SpeechSynthesisVoice[] = [];
const listeners = new Set<() => void>();
function loadVoices() {
  if (!speechSupported) return;
  voices = speechSynthesis.getVoices().filter(v => v.lang.toLowerCase().startsWith('en'));
  listeners.forEach(f => f());
}
if (speechSupported) {
  loadVoices();
  speechSynthesis.addEventListener?.('voiceschanged', loadVoices);
}
export function getEnglishVoices() { return voices; }
export function onVoicesChanged(f: () => void) { listeners.add(f); return () => { listeners.delete(f); }; }

export function pickVoice(preferred?: string): SpeechSynthesisVoice | undefined {
  if (preferred) { const v = voices.find(v => v.voiceURI === preferred); if (v) return v; }
  const us = voices.filter(v => v.lang.replace('_', '-').toLowerCase() === 'en-us');
  return us.find(v => v.localService) ?? us[0] ?? voices.find(v => v.localService) ?? voices[0];
}

export function speak(text: string, rate = 0.9, voiceURI?: string): boolean {
  if (!speechSupported) return false;
  try {
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    const v = pickVoice(voiceURI);
    if (v) u.voice = v;
    u.lang = v?.lang ?? 'en-US';
    u.rate = rate;
    speechSynthesis.speak(u);
    return true;
  } catch { return false; }
}
