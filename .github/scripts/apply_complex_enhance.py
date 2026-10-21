from pathlib import Path
import re

js = Path('assets/js/complex-enhance.js')
s = js.read_text(encoding='utf-8')
old = """  function keyboard() {
    addEventListener('keydown', e => {
      const tag = (e.target && e.target.tagName || '').toLowerCase();
      if (['input','textarea','select','button'].includes(tag) || e.target?.isContentEditable) return;
      if (e.code === 'Space') {
        e.preventDefault();
        if (STATIC_PAGES.has(PAGE)) primaryStaticAction(); else togglePlay() || primaryStaticAction();
      } else if (e.key.toLowerCase() === 'r') {
        if (!resetLike()) primaryStaticAction();
      }
    }, {passive:false});
  }
"""
new = """  function keyboard() {
    addEventListener('keydown', e => {
      const tag = (e.target && e.target.tagName || '').toLowerCase();
      if (['input','textarea','select','button'].includes(tag) || e.target?.isContentEditable) return;
      if (e.code === 'Space') {
        e.preventDefault();
        e.stopImmediatePropagation();
        if (STATIC_PAGES.has(PAGE)) primaryStaticAction(); else togglePlay() || primaryStaticAction();
      } else if (e.key.toLowerCase() === 'r') {
        e.preventDefault();
        e.stopImmediatePropagation();
        if (!resetLike()) primaryStaticAction();
      }
    }, {capture:true, passive:false});
  }
"""
if old in s:
    s = s.replace(old, new, 1)
elif "{capture:true, passive:false}" not in s:
    raise SystemExit('keyboard function target not found')
js.write_text(s, encoding='utf-8')

lab = Path('complex-lab.html').read_text(encoding='utf-8')
pages = sorted(set(re.findall(r'href=[\"\']([^\"\']+\.html)[\"\']', lab)))
pages = [p for p in pages if not p.startswith(('http://','https://')) and p not in ('index.html','complex-lab.html')]
tag = '<script src="assets/js/complex-enhance.js"></script>'
patched = []
missing = []
for name in pages:
    p = Path(name)
    if not p.exists():
        missing.append(name)
        continue
    text = p.read_text(encoding='utf-8')
    if 'assets/js/complex-enhance.js' in text:
        continue
    if '</body>' not in text:
        missing.append(name + ' [no body]')
        continue
    text = text.replace('</body>', tag + '\n</body>', 1)
    p.write_text(text, encoding='utf-8')
    patched.append(name)

print('experiment pages:', len(pages))
print('patched:', len(patched))
print('missing:', missing)
if len(pages) < 48:
    raise SystemExit(f'expected at least 48 experiment pages, got {len(pages)}')
if missing:
    raise SystemExit('some experiment pages could not be patched')
