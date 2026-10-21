(() => {
  'use strict';
  const PAGE = location.pathname.split('/').pop() || '';
  const HELP = {
    'life.html': {level:'A', title:'先看这三件事', items:['黑格表示活细胞，白格表示死细胞。','每一步只看周围 8 个邻居；B3/S23 决定出生和存活。','先放 Glider（滑翔机）或 Gosper Gun（高斯帕滑翔机枪），再按空格观察。'], first:'先试：Glider（滑翔机） → Gosper Gun（高斯帕滑翔机枪）。'},
'neural-life.html': {level:'B', title:'先看可见状态和隐藏状态', items:['Color（颜色）显示最终可见图像；Hidden（隐藏通道）显示内部状态，不对应固定物理量。','Damage（损伤）后继续演化，观察目标形态能否恢复。','Update（更新量）显示当前哪些区域正在被局部规则修改。'], first:'先选 Regenerating Lizard（可再生蜥蜴），长成后在中间划掉一块。'},
    'lenia.html': {level:'B', title:'先看形态是否稳定', items:['画面亮度表示连续细胞状态，状态取连续值。','R 控制感知半径；μ 和 σ 控制哪些局部密度会增长；Δt 控制时间步长。','参数稍变就可能让结构移动、变形、爆炸或消失。'], first:'先选 Orbium（欧比姆），只改 μ 或 σ 中一个。'},
    'reaction-diffusion.html': {level:'B', title:'先看 F 和 k', items:['颜色表示两种化学组分的浓度差异。','F 是补料率，k 是移除率；这两个参数决定最终图样属于 spots（斑点）、worms（虫纹）还是其他类型。','图样会先从局部扰动扩散，再形成稳定或持续变化的纹理。'], first:'先按 Mitosis（分裂）或 Worms（虫纹），再只微调 F。'},
    'ising.html': {level:'B', title:'先看温度和磁化', items:['黑白格表示自旋 +1/-1；大块同色区域就是磁畴。','T<Tc 时容易形成大磁畴；T≈Tc 时涨落最大；T>Tc 时趋向无序。','Magnetization M（磁化强度）接近 ±1 表示高度有序，接近 0 表示正负自旋大致抵消。'], first:'依次看 Low T（低温）→ Tc（临界温度）→ High T（高温）。'},
    'sandpile.html': {level:'B', title:'先看雪崩怎么发生', items:['每格数字可理解为局部沙粒高度；达到 4 就向四邻居各送 1 粒。','红色闪烁表示本帧发生 toppling（倾倒）的格点。','Size（规模）是倾倒总次数；Duration（持续时间）是传播了多少帧；Area（面积）是有多少不同格点参与。'], first:'先用 Near-critical（近临界初态），再点 +1 grain（加一粒）。'},
    'boids.html': {level:'A', title:'先看三条局部规则', items:['Separation（分离）避免靠太近。','Alignment（对齐）让速度方向接近邻居。','Cohesion（聚合）把个体拉向邻居中心。'], first:'先提高 Alignment（对齐），再把 Noise（噪声）调高。'},
    'physarum.html': {level:'B', title:'先看粒子和轨迹场', items:['移动粒子会留下 chemical trail（化学轨迹）。','后来的粒子会偏向轨迹浓度更高的位置，路径因此被反复强化。','Food node（食物点）改变局部吸引，网络会重新连接。'], first:'先放 3–5 个食物点，然后等 10 秒看网络收缩。'},
    'kuramoto.html': {level:'B', title:'先看同步序参量 R', items:['圆周上的点表示各振子的相位。','R≈0 表示相位分散；R≈1 表示大部分振子同步。','K 是耦合强度；频率展宽和噪声会抵抗同步。'], first:'从 K=0 开始慢慢提高 K，盯着 R 的变化。'},
    'lorenz.html': {level:'B', title:'先看两条几乎相同的轨迹', items:['三维轨迹长期停留在 attractor（吸引子）上，轨迹通常不闭合。','两条初始条件只差很小的轨迹会先贴在一起，之后迅速分开。','右侧 divergence（分离度）越快增大，初值敏感性越明显。'], first:'保持经典参数 σ=10, ρ=28, β=8/3，只重置近邻初态。'},
    'double-pendulum.html': {level:'A', title:'先比较低能量和高能量', items:['两个摆臂的角度彼此耦合。','小振幅时运动较规则；能量增大后会翻转并出现混沌。','双轨迹模式用来观察近邻初态随时间分离。'], first:'先看 Small oscillation（小振动），再切 Chaotic（混沌）。'},
    'percolation.html': {level:'C', title:'这张图怎么读', items:['每个格点以概率 p 被占据。','相连的占据格点组成 cluster（团簇）；最大的贯穿团簇会被重点显示。','二维方格 site percolation（格点渗流）的临界概率约 pc≈0.5927；低于它通常不贯穿，高于它通常出现贯穿结构。'], first:'依次点 Below pc（临界下）→ Near pc（临界附近）→ Above pc（临界上）。'},
'wave-lab.html': {level:'A', title:'先看波前', items:['亮暗表示场 u 的正负振幅。','点击画布会产生局部脉冲；边界会反射。','双缝模式中，固定频率源穿过两个狭缝后形成干涉条纹。'], first:'先点一次画布，再开 Double slit（双缝）。'},
    'elementary-ca.html': {level:'B', title:'时间是向下走的', items:['最上面一行是初态，下面每一行是下一时间步。','每个格子只看“左邻居 + 自己 + 右邻居”三个 bit。','Rule 90（规则90）产生 Sierpiński（三角分形）；Rule 30（规则30）更像伪随机；Rule 110（规则110）能产生复杂传播结构。'], first:'按 Rule 90 → Rule 30 → Rule 110 的顺序看。'},
    'logistic-map.html': {level:'C', title:'左边分岔图怎么读', items:['横轴是参数 r；纵轴是长期可能出现的 x 值。','一条线表示稳定到一个值；两条、四条、八条分支对应倍周期分岔。','Lyapunov exponent（李雅普诺夫指数）>0 通常表示对初值敏感的混沌区。'], first:'依次跳到 r=2.8、3.2、3.5699、3.9。'},
    'mandelbrot.html': {level:'B', title:'先看黑色区域和边界', items:['每个像素对应一个复参数 c。','若迭代 z←z²+c 长期不逃逸，该点属于 Mandelbrot 集；颜色表示逃逸速度。','细节最丰富的结构集中在黑色集合的边界附近，滚轮或点击边界继续放大。'], first:'先看全景，再进入 Seahorse Valley（海马谷）。'},
    'dla.html': {level:'A', title:'先看枝条为什么变细', items:['随机游走粒子从远处接近中心团簇。','第一次碰到团簇就永久粘住。','外侧枝条更容易先截获粒子，内侧区域因此被“屏蔽”。'], first:'先保持单种子，等团簇长到几百个粒子。'},
'sir-network.html': {level:'C', title:'颜色对应 S / I / R 三类节点', items:['S（易感）能被感染；I（感染）能传播；R（康复/移除）不再参与传播。','β 控制沿网络边传播的概率，γ 控制感染者恢复速度。','右侧曲线看三类节点比例；网络 shortcut（捷径）越多，全局传播通常越快。'], first:'先看同一 β、γ 下，规则网络和 small-world（小世界）网络的差别。'},
'lattice-boltzmann.html': {level:'C', title:'先看速度、涡量和 Re', items:['主图灰度表示速度大小；红蓝偏色表示 vorticity（涡量）的正负。','τ 控制黏性；τ 越接近 0.5，黏性越低。','Reynolds number（雷诺数）越大，惯性相对黏性越强，圆柱后方尾迹更容易出现复杂涡结构。'], first:'先用低入口速度看平滑尾流，再逐步提高速度。'},
'hopfield.html': {level:'C', title:'先看 overlap 和 energy', items:['Stored pattern（已存模式）是网络记住的图案。','Overlap（重合度）=1 表示当前状态与目标记忆完全一致；接近 0 表示几乎无关。','异步更新会沿 energy（能量）下降，通常把带噪图案拉回某个记忆吸引子。'], first:'先加 20% noise（噪声），播放；再试 40%。'},
};

  const cfg = HELP[PAGE];
  if (!cfg) return;

  const css = document.createElement('style');
  css.textContent = `
    .cx-read{margin:18px 0 20px;border:1px solid #cfcfc9;background:#fff;padding:14px 16px;max-width:100%}
    .cx-read-top{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:8px}
    .cx-read-level{font:700 10px/1 ui-monospace,SFMono-Regular,Menlo,monospace;border:1px solid #aaa;padding:4px 6px;color:#555}
    .cx-read h2{font:700 15px/1.3 ui-monospace,SFMono-Regular,Menlo,monospace;margin:0}
    .cx-read ol{margin:8px 0 8px 20px;padding:0}.cx-read li{margin:5px 0;font-size:13px;line-height:1.6;color:#333}
    .cx-read-first{margin-top:10px;padding-top:9px;border-top:1px solid #e3e3dd;font-size:13px;line-height:1.55;color:#111}
  `;
  document.head.appendChild(css);

  const box = document.createElement('section');
  box.className = 'cx-read';
  box.innerHTML = `<div class="cx-read-top"><span class="cx-read-level">${cfg.level}</span><h2>${cfg.title}</h2></div><ol>${cfg.items.map(x=>`<li>${x}</li>`).join('')}</ol><div class="cx-read-first"><strong>第一次建议：</strong>${cfg.first}</div>`;

  const header = document.querySelector('.sim-top,.life-topbar,.neural-topbar,header');
  const layout = document.querySelector('.sim-layout,.life-main,.neural-main');
  if (layout && layout.parentNode) layout.parentNode.insertBefore(box, layout);
  else if (header && header.parentNode) header.parentNode.insertBefore(box, header.nextSibling);
  else (document.querySelector('main') || document.body).prepend(box);
})();
