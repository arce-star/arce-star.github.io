from pathlib import Path

p = Path('investment-study.html')
s = p.read_text(encoding='utf-8')
needle = '  <script src="assets/js/crypto-real-practice.js"></script>\n'
if 'assets/js/crypto-real-practice.js' not in s:
    s = s.replace('</body>', needle + '</body>')
p.write_text(s, encoding='utf-8')
