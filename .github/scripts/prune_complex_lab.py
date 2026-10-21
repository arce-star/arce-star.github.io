from pathlib import Path
import re

REMOVE = {
    'life-phase-map.html',
    'life-rule-explorer.html',
    'life3d.html',
    'swift-hohenberg.html',
    'kpz-growth.html',
    'contact-process.html',
    'bak-sneppen.html',
    'potts-model.html',
    'voter-model.html',
    'network-percolation.html',
    'network-kuramoto.html',
    'rossler.html',
    'henon-map.html',
    'fitzhugh-nagumo.html',
    'chladni-patterns.html',
    'forest-fire.html',
}

# 1) Prune cards from the Complex Lab homepage.
p = Path('complex-lab.html')
s = p.read_text(encoding='utf-8')
for name in sorted(REMOVE):
    pattern = re.compile(r'^\s*<a class="lab-card" href="' + re.escape(name) + r'">.*?</a>\s*\n?', re.M)
    s, n = pattern.subn('', s)
    print(name, 'removed cards =', n)

s = s.replace('48 个元胞自动机', '32 个元胞自动机')
s = s.replace('<strong>48</strong>LIVE EXPERIMENTS', '<strong>32</strong>LIVE EXPERIMENTS')

counter = 0
def renumber(m):
    global counter
    counter += 1
    return f'<span class="lab-index">{counter:02d}</span>'
s = re.sub(r'<span class="lab-index">\d+</span>', renumber, s)
p.write_text(s, encoding='utf-8')
print('visible experiments =', counter)
if counter != 32:
    raise SystemExit(f'expected 32 cards, got {counter}')

# 2) Remove page-specific help/config entries for deleted experiments.
for js_name in ['assets/js/complex-enhance.js', 'assets/js/complex-page-help.js']:
    jp = Path(js_name)
    text = jp.read_text(encoding='utf-8')
    before = text
    for name in sorted(REMOVE):
        text = re.sub(
            r'^\s*[\'\"]' + re.escape(name) + r'[\'\"]:\s*\{.*\},?\s*\n?',
            '',
            text,
            flags=re.M,
        )
        text = text.replace("'" + name + "',", '')
        text = text.replace(",'" + name + "'", '')
    if text != before:
        jp.write_text(text, encoding='utf-8')
        print('cleaned', js_name)

# 3) Delete retired experiment pages and dedicated 3D-Life assets.
for name in sorted(REMOVE):
    fp = Path(name)
    if fp.exists():
        fp.unlink()
        print('deleted', name)

for asset in ['assets/css/life3d.css', 'assets/js/life3d.js']:
    fp = Path(asset)
    if fp.exists():
        fp.unlink()
        print('deleted', asset)
