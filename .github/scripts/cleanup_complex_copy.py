from pathlib import Path

# Homepage: shorter, factual copy.
p = Path('complex-lab.html')
s = p.read_text(encoding='utf-8')
repls = {
    'interactive playground / ai × physics': '交互式复杂系统实验',
    '从局部规则到全局涌现：直接改变控制参数，观察动力学、相变、临界性、同步、网络、流体、分形、记忆与混沌如何出现。这里不是动画合集，而是一组可以亲手扰动的复杂系统实验。': '调节参数和初始条件，观察相变、临界性、同步、网络、流体、分形、记忆与混沌等动力学行为。',
    '<code>local rules → nonlinear dynamics → emergence</code>': '<code>局部规则 → 非线性动力学 → 涌现</code>',
}
for old, new in repls.items():
    if old in s:
        s = s.replace(old, new)
if 'assets/js/complex-glossary.js' not in s:
    s = s.replace('</body>', '<script src="assets/js/complex-glossary.js"></script>\n</body>', 1)
p.write_text(s, encoding='utf-8')

# Shared experiment guide: remove rhetorical/filler copy and load glossary everywhere.
p = Path('assets/js/complex-enhance.js')
s = p.read_text(encoding='utf-8')
repls = {
    'Lenia 可以看成“连续版生命游戏”：细胞状态从 0/1 变成连续值，邻域从离散计数变成连续卷积核。': 'Lenia 使用连续状态和连续邻域核。细胞状态从 0/1 变成连续值，邻域更新由离散计数改为连续卷积。',
    '二维 Ising 模型是统计物理中研究相变和自发对称破缺的标准模型。': '二维 Ising 模型用于研究相变和自发对称破缺。',
    'Lorenz 系统是低维确定性混沌的代表。只有三个 ODE，却会形成蝴蝶状 strange attractor。': 'Lorenz 系统由三个 ODE 构成，长期轨迹形成蝴蝶状 strange attractor。',
    '双摆是最直观的机械混沌系统之一。只有两个刚性摆臂，但非线性耦合会产生极强初值敏感性。': '双摆由两个刚性摆臂耦合组成。非线性耦合会产生明显的初值敏感性。',
    'Logistic map 是通向混沌的教科书模型：一个参数 r 就能经历定点、倍周期分岔和混沌。': 'Logistic map 通过参数 r 展示定点、倍周期分岔和混沌。',
    'SIR network 把传染病模型放到显式接触网络上，比均匀混合 ODE 更能展示拓扑作用。': 'SIR network 将传播限制在显式接触网络上，用于观察网络拓扑对传播过程的影响。',
    'Wigner 随机矩阵展示一个很典型的“微观随机、宏观确定”现象：大量随机矩阵的本征值密度趋向半圆律。': 'Wigner 随机矩阵的本征值密度在矩阵维度增大时趋向半圆律。',
    'Life Rule Explorer 不再只玩 Conway，而是直接探索 outer-totalistic B/S 规则空间。': 'Life Rule Explorer 用于探索 outer-totalistic B/S 规则空间。',
    'Lattice Boltzmann Method 用离散速度分布函数模拟流体，是从介观碰撞/迁移规则涌现 Navier–Stokes 行为的代表。': 'Lattice Boltzmann Method 用离散速度分布函数模拟流体。局部碰撞和迁移产生宏观流动。',
    'Rössler 系统是结构非常清楚的三维混沌 ODE：轨迹先旋转，再被 z 方向拉伸折回。': 'Rössler 系统是三维混沌 ODE。轨迹先旋转，再沿 z 方向拉伸并折回。',
    'Hopfield network 是最经典的 attractor memory。训练图案被写进权重矩阵后，带噪版本会沿能量下降回到最近的记忆。': 'Hopfield network 是 attractor memory 模型。带噪输入通过异步更新向已存储模式收敛。',
    'KPZ 方程描述随机生长界面，是非平衡统计物理最重要的 universality class 之一。': 'KPZ 方程描述带噪声和非线性斜率项的随机界面生长。',
    'Life Phase Map 把 CA 从“看一个规则”提升到“扫描规则空间”。这里固定大部分 B/S 条件，只扫描两个关键邻居数。': 'Life Phase Map 扫描一组 CA 规则，并比较它们的长期密度和活性。这里固定大部分 B/S 条件，只扫描两个邻居数。',
    '<div class="cx-guide-head"><h2>How to explore this system</h2><span class="cx-guide-sub">先选一个经典案例，再改一个参数</span></div>': '<div class="cx-guide-head"><h2>使用方法</h2><span class="cx-guide-sub">先选经典案例，再改一个参数</span></div>',
    '<div class="cx-tip"><strong>推荐操作：</strong>不要一次改很多参数。先点一个经典案例，观察 5–20 秒，再只改一个 slider；这样最容易看出控制参数和宏观行为之间的因果关系。</div>': '<div class="cx-tip"><strong>推荐操作：</strong>先选一个经典案例，观察 5–20 秒，再只改一个参数。记录图案、序参量或时间序列的变化。</div>',
}
for old, new in repls.items():
    if old in s:
        s = s.replace(old, new)

if 'function loadGlossary()' not in s:
    marker = '  function normalizePlayButton() {'
    helper = '''  function loadGlossary() {\n    if (document.querySelector('script[src*="complex-glossary.js"]')) return;\n    const script = document.createElement('script');\n    script.src = 'assets/js/complex-glossary.js';\n    script.defer = true;\n    document.body.appendChild(script);\n  }\n\n'''
    if marker not in s:
        raise SystemExit('normalizePlayButton marker not found')
    s = s.replace(marker, helper + marker, 1)

old_init = '''    addGuide(META[PAGE]);\n    normalizePlayButton();\n    keyboard();'''
new_init = '''    addGuide(META[PAGE]);\n    normalizePlayButton();\n    keyboard();\n    loadGlossary();'''
if old_init in s:
    s = s.replace(old_init, new_init, 1)
elif 'loadGlossary();' not in s:
    raise SystemExit('init marker not found')

p.write_text(s, encoding='utf-8')

print('copy cleanup complete')
