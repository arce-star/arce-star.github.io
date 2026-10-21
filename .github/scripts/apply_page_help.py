from pathlib import Path
import re

lab = Path('complex-lab.html').read_text(encoding='utf-8')
pages = sorted(set(re.findall(r'href=[\"\']([^\"\']+\.html)[\"\']', lab)))
pages = [p for p in pages if p not in ('index.html','complex-lab.html') and not p.startswith(('http://','https://'))]

tag = '<script src="assets/js/complex-page-help.js"></script>'
patched=[]
missing=[]
for name in pages:
    p=Path(name)
    if not p.exists():
        missing.append(name)
        continue
    s=p.read_text(encoding='utf-8')
    if 'assets/js/complex-page-help.js' not in s:
        if '</body>' not in s:
            missing.append(name+' [no body]')
            continue
        s=s.replace('</body>', tag+'\n</body>', 1)
        p.write_text(s, encoding='utf-8')
        patched.append(name)

print('pages', len(pages))
print('patched', len(patched))
print('missing', missing)
if len(pages) != 48:
    raise SystemExit(f'expected 48 experiment pages, got {len(pages)}')
if missing:
    raise SystemExit('missing pages: '+', '.join(missing))
