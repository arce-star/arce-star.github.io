from pathlib import Path

p = Path('investment-study.html')
s = p.read_text(encoding='utf-8')
needle = '  <script src="assets/js/crypto-real-practice.js"></script>'
addon = '  <script src="assets/js/crypto-practice-journal.js"></script>'

if addon not in s:
    if needle not in s:
        raise SystemExit('crypto-real-practice script tag not found')
    s = s.replace(needle, needle + '\n' + addon, 1)
    p.write_text(s, encoding='utf-8')
    print('patched investment-study.html')
else:
    print('already patched')
