from pathlib import Path
p=Path('index.html')
s=p.read_text(encoding='utf-8')
old='''                <a href="complex-lab.html"><i class="fas fa-project-diagram"></i> Complex Lab</a>\n                <a href="gomoku.html"><i class="fas fa-chess-board"></i> 五子棋</a>'''
new='''                <a href="complex-lab.html"><i class="fas fa-project-diagram"></i> Complex Lab</a>\n                <a href="investment-study.html"><i class="fas fa-chart-line"></i> 投资学习</a>\n                <a href="gomoku.html"><i class="fas fa-chess-board"></i> 五子棋</a>'''
if old not in s:
    raise SystemExit('target sidebar block not found')
s=s.replace(old,new,1)
p.write_text(s,encoding='utf-8')
print('investment study link added')
