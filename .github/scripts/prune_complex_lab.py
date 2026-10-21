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

p = Path('complex-lab.html')
s = p.read_text(encoding='utf-8')

# Remove one-line experiment cards by href.
for name in sorted(REMOVE):
    pattern = re.compile(r'^\s*<a class="lab-card" href="' + re.escape(name) + r'">.*?</a>\s*\n?', re.M)
    s, n = pattern.subn('', s)
    print(name, 'removed cards =', n)

# Update counts/copy.
s = s.replace('48 个元胞自动机', '32 个元胞自动机')
s = s.replace('<strong>48</strong>LIVE EXPERIMENTS', '<strong>32</strong>LIVE EXPERIMENTS')

# Renumber visible cards sequentially so the homepage no longer has gaps.
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
