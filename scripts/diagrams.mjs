// Self-made schematic pictures (drawn here, no external licence) for words that ordinary icons cannot show:
// prepositions of place/movement (box + ball), compass directions, and frequency adverbs (5-dot scale).
const S = 'fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"';
const box = (x, y, w = 8, h = 8) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="1.2"/>`;
const ball = (x, y, r = 3.2, o = 1) => `<circle cx="${x}" cy="${y}" r="${r}"${o < 1 ? ` opacity="${o}"` : ''}/>`;
const arrow = (x1, y1, x2, y2, w = 2) => {
  const a = Math.atan2(y2 - y1, x2 - x1), h = 3.2;
  const p = (d, s) => `${(x2 - h * Math.cos(a + s * 0.55)).toFixed(2)} ${(y2 - h * Math.sin(a + s * 0.55)).toFixed(2)}`;
  return `<path ${S} stroke-width="${w}" d="M${x1} ${y1}L${x2} ${y2}M${p(0, 1)}L${x2} ${y2}L${p(0, -1)}"/>`;
};
const cup = (x, w = 14) => `<path d="M${x} 7h2v11h${w - 4}V7h2v13H${x}z"/>`;
export const POS = {
  under: box(8, 2.5) + ball(12, 17.5),
  above: ball(12, 5.5) + box(8, 12.5),
  'next-to': box(2.5, 9) + ball(17.5, 13),
  between: box(0.8, 9, 7, 8) + box(16.2, 9, 7, 8) + ball(12, 13, 2.8),
  inside: cup(4) + ball(12, 14),
  outside: cup(1.5, 12) + ball(19.5, 16.5, 3),
  behind: ball(15.5, 9, 4.2, 0.4) + box(4, 9, 10, 10),
  opposite: box(1, 8, 6, 8) + box(17, 8, 6, 8) + `<path ${S} stroke-width="1.4" stroke-dasharray="2 2" d="M12 3v18"/>`,
  around: box(8, 8) + `<circle ${S} stroke-width="1.4" stroke-dasharray="2.2 2" cx="12" cy="12" r="9.3"/>` + ball(18.6, 5.4, 2.4),
  through: `<path ${S} stroke-width="1.6" d="M7 6.5h10v11H7z"/>` + arrow(1.5, 12, 22.5, 12, 2.2),
  across: `<path ${S} stroke-width="1.6" d="M2 7h20M2 17h20"/>` + arrow(12, 21.5, 12, 2.5, 2.2),
  along: `<path ${S} stroke-width="1.6" d="M2 17h20"/>` + arrow(3, 12, 21, 12, 2.2),
  toward: ball(4.5, 12, 3) + arrow(9, 12, 15, 12, 2) + box(16.5, 8),
  top: `<path ${S} stroke-width="1.5" d="M5 2.5h14v19H5z"/><rect x="5" y="2.5" width="14" height="6.3"/>`,
  middle: `<path ${S} stroke-width="1.5" d="M5 2.5h14v19H5z"/><rect x="5" y="8.8" width="14" height="6.4"/>`,
  bottom: `<path ${S} stroke-width="1.5" d="M5 2.5h14v19H5z"/><rect x="5" y="15.2" width="14" height="6.3"/>`,
  side: `<path ${S} stroke-width="1.5" d="M2.5 5h19v14h-19z"/><rect x="15.2" y="5" width="6.3" height="14"/>`,
};
const compass = deg => `<circle ${S} stroke-width="1.4" cx="12" cy="12" r="10"/><path ${S} stroke-width="1.2" d="M12 2v2.2M12 19.8V22M2 12h2.2M19.8 12H22"/>` +
  `<g transform="rotate(${deg} 12 12)"><path d="M12 4.2l3.2 8.3h-6.4z"/><path opacity=".35" d="M12 19.8l3.2-7.3h-6.4z"/></g>`;
export const DIR = { north: compass(0), east: compass(90), south: compass(180), west: compass(270) };
export const freq = n => [0, 1, 2, 3, 4].map(i => `<circle cx="${3.2 + i * 4.4}" cy="12" r="1.8"${i < n ? '' : ` ${S} stroke-width="1"`}/>`).join('');
// Opposites shown as a comparison: the filled shape is the word, the outlined one is the contrast.
const O = `fill="none" stroke="currentColor" stroke-width="1.3" stroke-dasharray="2 1.6"`;
const ground = `<path fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" d="M2 21h20"/>`;
export const CMP = {
  big: `<rect x="1.5" y="5" width="14" height="14" rx="1.5"/><rect ${O} x="17.5" y="13" width="5" height="5" rx=".8"/>`,
  small: `<rect ${O} x="1.5" y="5" width="14" height="14" rx="1.5"/><rect x="17.5" y="13" width="5" height="5" rx=".8"/>`,
  tall: ground + `<rect x="5" y="2" width="5" height="18" rx="1"/><rect ${O} x="14" y="13" width="5" height="7" rx="1"/>`,
  long: `<rect x="1.5" y="7" width="21" height="4" rx="1"/><rect ${O} x="1.5" y="14" width="8" height="4" rx="1"/>`,
  short: `<rect ${O} x="1.5" y="7" width="21" height="4" rx="1"/><rect x="1.5" y="14" width="8" height="4" rx="1"/>`,
  wide: `<rect x="1.5" y="3" width="21" height="9" rx="1"/><rect ${O} x="7" y="15" width="10" height="6" rx="1"/>`,
  narrow: `<rect ${O} x="1.5" y="3" width="21" height="9" rx="1"/><rect x="10" y="14" width="4" height="8" rx="1"/>`,
  thick: `<rect x="2" y="5" width="20" height="7" rx="1"/><rect x="2" y="16.5" width="20" height="1" rx=".5" opacity=".4"/>`,
  thin: `<rect x="2" y="5" width="20" height="7" rx="1" opacity=".3"/><rect x="2" y="16" width="20" height="1.6" rx=".8"/>`,
  high: ground + `<circle cx="12" cy="5" r="3.2"/><circle ${O} cx="12" cy="17" r="3"/>`,
  low: ground + `<circle ${O} cx="12" cy="5" r="3"/><circle cx="12" cy="17" r="3.2"/>`,
  full: `<path fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" d="M5 3h14l-1.6 18H6.6z"/><path d="M5.6 7.5h12.8L17 20.2H7z"/>`,
  empty: `<path fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" d="M5 3h14l-1.6 18H6.6z"/>`,
  near: `<rect x="3" y="8" width="8" height="8" rx="1.2"/><circle cx="15" cy="12" r="3"/>`,
  far: `<rect x="1.5" y="8" width="7" height="7" rx="1.2"/><path fill="none" stroke="currentColor" stroke-width="1.4" stroke-dasharray="1.5 1.8" d="M10.5 11.5h7"/><circle cx="20.5" cy="11.5" r="2.4"/>`,
  same: `<rect x="2" y="7" width="9" height="9" rx="1.2"/><rect x="13" y="7" width="9" height="9" rx="1.2"/>`,
  different: `<rect x="2" y="7" width="9" height="9" rx="1.2"/><path d="M17.5 6.5l5 9.5h-10z"/>`,
  first: `<circle cx="3.2" cy="12" r="2.4"/>` + [1, 2, 3, 4].map(i => `<circle cx="${3.2 + i * 4.4}" cy="12" r="1.6" opacity=".35"/>`).join(''),
  last: [0, 1, 2, 3].map(i => `<circle cx="${3.2 + i * 4.4}" cy="12" r="1.6" opacity=".35"/>`).join('') + `<circle cx="20.8" cy="12" r="2.4"/>`,
};
