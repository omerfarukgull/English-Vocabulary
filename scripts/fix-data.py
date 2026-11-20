# Yeni dosyalardaki (w00 hariç) tekrar eden kelimeleri siler, olmayan/tekrar eden ikonları '-' yapar.
import os, re, sys
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
icons = set(f[:-4] for f in os.listdir(os.path.join(root, 'node_modules/@mdi/svg/svg')))
seen, used = set(), set()
for fn in sorted(f for f in os.listdir(os.path.join(root, 'data')) if f.endswith('.psv')):
    p = os.path.join(root, 'data', fn); out = []; changed = False
    for line in open(p, encoding='utf8').read().split('\n'):
        f = line.split('|')
        if len(f) == 8 and not line.startswith('#'):
            i = re.sub(r'[^a-z]+', '-', f[0].lower()).strip('-')
            if i in seen:
                print('SİLİNDİ', fn, f[0]); changed = True; continue
            seen.add(i)
            ic = f[7].strip()
            if ic != '-' and (ic not in icons or ic in used):
                print('İKON KALDIRILDI', fn, f[0], ic); f[7] = '-'; line = '|'.join(f); changed = True
            elif ic != '-': used.add(ic)
        out.append(line)
    if changed: open(p, 'w', encoding='utf8').write('\n'.join(out))
