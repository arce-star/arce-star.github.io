from pathlib import Path
import re

REMOVE = {
    'langtons-ant.html',
    'xy-model.html',
    'random-matrix.html',
    'schelling.html',
    'preferential-attachment.html',
    'lotka-volterra.html',
}

# Homepage
p = Path('complex-lab.html')
s = p.read_text(encoding='utf-8')
for name in sorted(REMOVE):
    pattern = re.compile(r'^\s*<a class="lab-card" href="' + re.escape(name) + r'">.*?</a>\s*\n?', re.M)
    s, n = pattern.subn('', s)
    print(name, 'removed cards =', n)

s = s.replace('26 个元胞自动机', '20 个元胞自动机')
s = s.replace('<strong>26</strong>LIVE EXPERIMENTS', '<strong>20</strong>LIVE EXPERIMENTS')

counter = 0
def renumber(m):
    global counter
    counter += 1
    return f'<span class="lab-index">{counter:02d}</span>'
s = re.sub(r'<span class="lab-index">\d+</span>', renumber, s)
p.write_text(s, encoding='utf-8')
print('visible experiments =', counter)
if counter != 20:
    raise SystemExit(f'expected 20 cards, got {counter}')

# Remove retired page metadata from shared scripts.
for jsname in ['assets/js/complex-enhance.js', 'assets/js/complex-page-help.js']:
    p = Path(jsname)
    s = p.read_text(encoding='utf-8')
    for name in REMOVE:
        s = re.sub(r'^\s*[\'\"]' + re.escape(name) + r'[\'\"]\s*:\s*\{.*?\},?\s*\n?', '', s, flags=re.M)
    p.write_text(s, encoding='utf-8')
    print('cleaned', jsname)

for name in sorted(REMOVE):
    p = Path(name)
    if p.exists():
        p.unlink()
        print('deleted', name)
