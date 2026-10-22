from pathlib import Path

p = Path('investment-study.html')
s = p.read_text(encoding='utf-8')

css = '  <link rel="stylesheet" href="assets/css/investment-study-practice.css">\n'
js = '  <script src="assets/js/investment-study-practice.js"></script>\n'

if 'assets/css/investment-study-practice.css' not in s:
    s = s.replace('</head>', css + '</head>')

if 'assets/js/investment-study-practice.js' not in s:
    s = s.replace('</body>', js + '</body>')

p.write_text(s, encoding='utf-8')
