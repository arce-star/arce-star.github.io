from pathlib import Path

p = Path('assets/js/complex-enhance.js')
s = p.read_text(encoding='utf-8')
old1 = "const cases = (meta.cases || []).map(([name]) => `<button type=\"button\" class=\"cx-case\" data-cx-case=\"${name.replace(/\"/g,'&quot;')}\">${name}</button>`).join('');"
new1 = "const cases = (meta.cases || []).map(([name, action]) => `<button type=\"button\" class=\"cx-case\" data-cx-case=\"${name.replace(/\"/g,'&quot;')}\" data-cx-action=\"${String(action || name).replace(/\"/g,'&quot;')}\">${name}</button>`).join('');"
old2 = "$$('.cx-case', guide).forEach(b => b.addEventListener('click', () => applyCase(b.dataset.cxCase)));"
new2 = "$$('.cx-case', guide).forEach(b => b.addEventListener('click', () => applyCase(b.dataset.cxAction || b.dataset.cxCase)));"
if old1 not in s:
    raise SystemExit('classic cases markup target not found')
if old2 not in s:
    raise SystemExit('classic cases listener target not found')
s = s.replace(old1, new1, 1).replace(old2, new2, 1)
p.write_text(s, encoding='utf-8')
