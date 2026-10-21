from pathlib import Path
p = Path('assets/js/complex-enhance.js')
s = p.read_text(encoding='utf-8')
repls = {
    '康威生命游戏是最经典的二维元胞自动机。': '康威生命游戏是二维元胞自动机。',
    '它没有唯一“标准规则”，因此最适合用来观察规则选择如何改变三维形态。': '它没有唯一的标准规则，可以直接比较不同 B/S 规则产生的三维形态。',
    'Gray–Scott 反应扩散模型展示两个化学组分如何通过局部反应和扩散形成宏观斑图。': 'Gray–Scott 反应扩散模型由两个化学组分的局部反应和扩散产生空间斑图。',
    'Bak–Tang–Wiesenfeld 沙堆模型是 self-organized criticality 的经典原型。系统在持续缓慢驱动下，不需要手调控制参数也能靠近临界态。': 'Bak–Tang–Wiesenfeld 沙堆模型用于研究 self-organized criticality。缓慢驱动和边界耗散使系统长期接近临界态。',
    'Boids 展示三个非常简单的局部行为如何产生群体运动：分离、对齐和聚合。': 'Boids 使用分离、对齐和聚合三条局部规则生成群体运动。',
    'Vicsek 模型是 active matter 的标准极简模型：自推进粒子只做局部取向对齐并叠加噪声。': 'Vicsek 模型描述带噪声的局部取向对齐。粒子以固定速度自推进。',
    '二维波动方程展示传播、反射、干涉和驻波这些最基本的波动物理。': '二维波动方程包含传播、反射、干涉和驻波。',
    'Cahn–Hilliard 方程描述守恒序参量的相分离，是研究 spinodal decomposition 的标准 phase-field 模型。': 'Cahn–Hilliard 方程描述守恒序参量的相分离和 spinodal decomposition。',
    'Schelling segregation model 展示“个体只要求一点点相似邻居”也可能产生很强的宏观分区。': 'Schelling segregation model 根据局部邻居比例决定个体是否迁移，并产生宏观空间分区。',
    'Lotka–Volterra 是最经典的捕食者–猎物非线性动力系统。': 'Lotka–Volterra 描述捕食者与猎物种群的非线性耦合。',
    'Duffing oscillator 是受周期驱动的非线性双稳振子。它同时包含势阱、耗散和外驱，是研究混沌响应的标准模型。': 'Duffing oscillator 是受周期驱动的非线性双稳振子，包含双稳势阱、耗散和外部驱动。',
    'Contact process 是研究 absorbing-state phase transition 的标准随机格点模型。': 'Contact process 描述格点上的死亡与邻域感染，并产生 absorbing-state phase transition。',
    'Kauffman Random Boolean Network 把基因调控抽象成布尔节点和随机逻辑函数。连接度 K 控制 frozen、critical 和 chaotic regimes。': 'Kauffman Random Boolean Network 由布尔节点和随机逻辑函数组成。连接度 K 控制 frozen、critical 和 chaotic regimes。',
    'Chladni 图样把二维薄板的驻波节点线直接变成可见几何图案。真实实验里沙粒会被振动从腹部推向节点线。': 'Chladni 图样对应二维薄板驻波的节点线。真实实验中，沙粒会从振幅较大的区域移动到节点线附近。',
}
for old, new in repls.items():
    if old in s:
        s = s.replace(old, new)
p.write_text(s, encoding='utf-8')
print('second pass complete')
