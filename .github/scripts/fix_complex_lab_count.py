from pathlib import Path
p=Path('complex-lab.html')
s=p.read_text(encoding='utf-8')
s=s.replace('Complex Systems Lab · 48 live experiments','Complex Systems Lab · 20 live experiments')
p.write_text(s,encoding='utf-8')
print('fixed footer count')
