(() => {
  'use strict';

  const PAGE = location.pathname.split('/').pop() || '';
  const $ = (s, r=document) => r.querySelector(s);
  const $$ = (s, r=document) => [...r.querySelectorAll(s)];

  const META = {
    'life.html': {what:'康威生命游戏是二维元胞自动机。每个格点只有“生/死”两态，但局部 B3/S23 规则可以产生稳定结构、振荡器、飞船甚至通用计算。', mechanism:'每一步只统计 Moore 邻域的 8 个邻居：死细胞恰有 3 个邻居时出生；活细胞有 2 或 3 个邻居时存活。', watch:'先放 Glider、R-pentomino、Acorn 和 Gosper Glider Gun。重点看局部碰撞、周期结构和长期复杂性。', related:'Cellular Automata · Emergence · Universal Computation', cases:[['Glider','Glider'],['R-pentomino','R-pentomino'],['Acorn','Acorn'],['Gosper Gun','Gosper']]},
'neural-life.html': {what:'Neural Cellular Automata 用一个共享小神经网络替代手写 CA 规则。每个细胞有可见 RGBA 通道和隐藏状态，通过局部通信共同长成目标形态。', mechanism:'局部 perception → 神经网络 update → residual state update；同一规则被反复应用。训练后目标图案往往成为可恢复的吸引子。', watch:'先看从单 seed 生长，再用鼠标挖掉一块观察 regeneration；切换 hidden/update 视图看内部状态。', related:'Neural CA · Morphogenesis · Attractor · Regeneration', cases:[['Regenerating Lizard','Lizard'],['Butterfly','Butterfly'],['Fish','Fish'],['Smile','Smile']]},
    'lenia.html': {what:'Lenia 使用连续状态和连续邻域核。细胞状态从 0/1 变成连续值，邻域更新由离散计数改为连续卷积。', mechanism:'A(x,t) 先与 kernel 卷积得到局部势，再通过 growth function 连续更新。', watch:'观察稳定移动的类生命体、旋转/变形以及参数稍变后由稳定到崩溃的转变。', related:'Continuous CA · Artificial Life · Nonlinear Field', cases:[['Orbium','Orbium'],['Geminium','Geminium'],['Random Seed','Random'],['Center Seed','Center']]},
    'reaction-diffusion.html': {what:'Gray–Scott 反应扩散模型由两个化学组分的局部反应和扩散产生空间斑图。', mechanism:'扩散倾向抹平浓度，而非线性反应倾向放大局部差异；两者竞争产生 spots、worms、mitosis 等模式。', watch:'固定其他参数，只微调 F 与 k，观察图案从点状、条纹到混沌纹理的敏感变化。', related:'Reaction–Diffusion · Turing-like Pattern · PDE', cases:[['Mitosis','Mitosis'],['Coral','Coral'],['Worms','Worms'],['Spots','Spots']]},
    'ising.html': {what:'二维 Ising 模型用于研究相变和自发对称破缺。', mechanism:'每个自旋 s=±1 与最近邻耦合；Metropolis Monte Carlo 根据能量差和温度决定是否翻转。', watch:'在 Tc≈2.269 附近比较高温无序、低温磁畴和临界涨落；尝试 quench 看 domain coarsening。', related:'Statistical Mechanics · Phase Transition · Criticality', cases:[['Low T','Low T'],['Critical Tc','Tc'],['High T','High T'],['Quench','Quench']]},
    'sandpile.html': {what:'Bak–Tang–Wiesenfeld 沙堆模型用于研究 self-organized criticality。缓慢驱动和边界耗散使系统长期接近临界态。', mechanism:'格点高度 z≥4 时 toppling，把 4 粒沙分给四邻居；边界耗散。一次局部 toppling 可以触发跨尺度 avalanche。', watch:'看 avalanche size、duration、area 的巨大波动。Near-critical 初态能很快出现大小悬殊的级联。', related:'Self-Organized Criticality · Avalanche · Power Law', cases:[['Near-critical','Near-critical'],['Empty lattice','Empty'],['Center drive','中心'],['Random drive','随机']]},
    'percolation.html': {what:'二维 site percolation 研究随机占据的格点何时形成贯穿整个系统的连通团簇。', mechanism:'每个格点以概率 p 被占据；随着 p 增大，最大团簇在临界概率 pc≈0.5927 附近发生巨变。', watch:'扫过 pc，观察 spanning cluster 是否出现、最大团簇比例如何突增。', related:'Percolation · Continuous Phase Transition · Connectivity', cases:[['Below pc','0.50'],['Near pc','0.593'],['Above pc','0.68'],['Dense','0.80']]},
    'boids.html': {what:'Boids 使用分离、对齐和聚合三条局部规则生成群体运动。', mechanism:'每个 agent 只感知附近邻居，根据 separation/alignment/cohesion 更新速度方向。', watch:'把 alignment 拉高看整群锁定方向；增大 noise 或 predator 扰动看群体如何分裂再重组。', related:'Flocking · Collective Motion · Local Rules', cases:[['Flocking','Alignment'],['Loose swarm','Cohesion'],['Predator','Predator'],['Noisy','Noise']]},
    'physarum.html': {what:'Physarum 粒子模型模仿黏菌：移动粒子在场中留下 chemical trail，又根据 trail 浓度改变运动方向。', mechanism:'agent ↔ field 双向耦合形成正反馈：经过多的路径更吸引后续粒子，网络因此逐渐强化。', watch:'放置多个 food node，看系统从弥散粒子收缩成细丝和连接网络。', related:'Slime Mold · Agent–Field Coupling · Network Formation', cases:[['Food network','Food'],['Dense colony','Dense'],['Random','Random'],['Reset','Reset']]},
    'kuramoto.html': {what:'Kuramoto 模型描述大量具有不同自然频率的振子如何通过耦合自发同步。', mechanism:'每个相位 θi 受自身频率和所有其他振子的正弦耦合影响。序参量 R∈[0,1] 衡量同步程度。', watch:'缓慢提高 K，观察 R 从接近 0 上升到接近 1；再提高频率展宽或噪声破坏同步。', related:'Synchronization · Mean Field · Collective Dynamics', cases:[['Unsynced','K=0'],['Near onset','K'],['Strong sync','Strong'],['Noisy','Noise']]},
'lorenz.html': {what:'Lorenz 系统由三个 ODE 构成，长期轨迹形成蝴蝶状 strange attractor。', mechanism:'非线性耦合让轨迹被不断拉伸和折叠；近邻初态长期指数分离。', watch:'比较两个只差 ε 的初值，观察它们最初贴合、随后快速分离。', related:'Chaos · Strange Attractor · Sensitive Dependence', cases:[['Classic σ10 ρ28 β8/3','Classic'],['Periodic-ish','ρ=20'],['Chaotic','ρ=28'],['Reset pair','Reset']]},
    'double-pendulum.html': {what:'双摆由两个刚性摆臂耦合组成。非线性耦合会产生明显的初值敏感性。', mechanism:'完整拉格朗日方程决定两个角度的耦合演化。高能量时轨迹会出现翻转和混沌。', watch:'比较规则小振幅和高能混沌；让两个初态只差很小角度，看 divergence 如何增长。', related:'Nonlinear Mechanics · Chaos · Energy Exchange', cases:[['Small oscillation','Small'],['Chaotic','Chaotic'],['Near-identical pair','Pair'],['Reset','Reset']]},
    'wave-lab.html': {what:'二维波动方程包含传播、反射、干涉和驻波。', mechanism:'局部曲率通过 ∇²u 决定加速度；边界条件和外部周期源决定可见模式。', watch:'先点一个脉冲看圆波，再开双缝和周期源观察干涉条纹，最后看 standing wave。', related:'Wave Equation · Interference · Boundary Conditions', cases:[['Point pulse','Pulse'],['Double slit','双缝'],['Standing wave','驻波'],['Periodic source','周期源']]},
    'elementary-ca.html': {what:'Elementary CA 是一维二值元胞自动机。仅 3-cell 邻域就有 256 条规则，行为从固定点到分形、随机和通用计算。', mechanism:'下一状态完全由左、中、右三个 bit 对应的 8-entry rule table 决定。', watch:'Rule 30 看伪随机，Rule 90 看 Sierpiński 三角，Rule 110 看复杂传播结构，Rule 184 看交通流。', related:'1D CA · Computation · Wolfram Classes', cases:[['Rule 30','30'],['Rule 90','90'],['Rule 110','110'],['Rule 184','184']]},
    'logistic-map.html': {what:'Logistic map 通过参数 r 展示定点、倍周期分岔和混沌。', mechanism:'xn+1=r xn(1−xn)。非线性反馈让轨道随 r 发生一连串 bifurcation。', watch:'从 r≈3 开始逐渐增大，观察 period-2、4、8…以及 Feigenbaum accumulation。', related:'Bifurcation · Chaos · Lyapunov Exponent', cases:[['Stable','r=2.8'],['Period-2','r=3.2'],['Feigenbaum','3.5699'],['Chaos','r=3.9']]},
    'mandelbrot.html': {what:'Mandelbrot 集是复二次映射 zn+1=zn²+c 的参数空间。边界把稳定和逃逸轨道分开，并具有无限层级分形结构。', mechanism:'对每个 c 从 z0=0 迭代，若 |z| 最终超过 2 则判为逃逸；颜色编码 escape time。', watch:'不断点击边界放大；Seahorse Valley 和 spiral 都会在不同尺度继续出现新结构。', related:'Complex Dynamics · Fractal · Parameter Space', cases:[['Full set','全景'],['Seahorse Valley','Seahorse'],['Spiral','Spiral'],['Deep zoom','Seahorse']]},
    'dla.html': {what:'Diffusion-Limited Aggregation 模拟随机游走粒子扩散并在首次接触团簇时粘附。', mechanism:'随机游走 + irreversible sticking 产生 screening：外侧枝条更容易截获后来的粒子。', watch:'观察枝条竞争、尖端生长和内部空洞如何自然形成。', related:'Fractal Growth · Random Walk · Laplacian Growth', cases:[['Single seed','Single'],['Fast growth','Fast'],['Sparse','Sparse'],['Reset','Reset']]},
'xy-model.html': {what:'二维 XY 模型把 Ising 的 ±1 自旋推广为平面连续角度，核心拓扑缺陷是 vortex。', mechanism:'相邻 spins 倾向对齐，能量为 −J cos(θi−θj)。温度驱动 vortex–antivortex 的生成和束缚。', watch:'低温看长程取向相关，高温看无序；用 vortex seed 观察拓扑缺陷。', related:'BKT Transition · Vortex · O(2) Symmetry', cases:[['Low T','Low T'],['Near BKT','BKT'],['High T','High T'],['Vortex pair','Vortex']]},
    'schelling.html': {what:'Schelling segregation model 根据局部邻居比例决定个体是否迁移，并产生宏观空间分区。', mechanism:'不满意的 agent 搬到空位，局部迁移不断反馈放大空间相关。', watch:'把 tolerance 从宽松逐渐提高，观察满意率和 segregation index 如何变化。', related:'Agent-Based Model · Social Dynamics · Emergence', cases:[['Low tolerance','Low'],['Classic','Classic'],['High tolerance','High'],['Mixed start','Reset']]},
    'langtons-ant.html': {what:'Langton’s Ant 是极简 deterministic walker：根据当前格颜色右转/左转并翻色。', mechanism:'局部两条规则产生三个阶段：简单、复杂混乱、最终形成高速 highway。', watch:'让系统长时间运行，观察高度杂乱的中间阶段如何突然进入周期高速公路。', related:'Minimal CA · Emergence · Computation', cases:[['Classic single ant','Single'],['Fast-forward','Fast'],['Multiple ants','Multiple'],['Reset','Reset']]},
    'lotka-volterra.html': {what:'Lotka–Volterra 描述捕食者与猎物种群的非线性耦合。', mechanism:'猎物指数增长但被捕食压制；捕食者依赖猎物繁殖并自然死亡，形成耦合振荡。', watch:'看时间序列中的相位差，并在 phase portrait 中观察闭合轨道；人为扰动后看轨道如何改变。', related:'Population Dynamics · Phase Portrait · Nonlinear ODE', cases:[['Classic cycle','Classic'],['More prey','Prey'],['More predator','Predator'],['Perturb','Perturb']]},
'sir-network.html': {what:'SIR network 将传播限制在显式接触网络上，用于观察网络拓扑对传播过程的影响。', mechanism:'感染者以概率 β 沿边感染易感者，并以 γ 恢复；网络 rewiring 和 vaccination 会改变传播阈值。', watch:'比较 lattice-like 与 small-world 网络，观察少量 shortcut 如何加速全局传播。', related:'Network Epidemics · Small World · Spreading Threshold', cases:[['Low β','Low'],['Outbreak','Outbreak'],['Vaccinated','Vaccinated'],['Small-world','Small-world']]},
'random-matrix.html': {what:'Wigner 随机矩阵的本征值密度在矩阵维度增大时趋向半圆律。', mechanism:'对称随机矩阵按 1/√N 缩放后，谱在 N 增大时收敛到 universal density。', watch:'增大 N、重复抽样，比较直方图如何逐渐贴近 Wigner semicircle。', related:'Random Matrix Theory · Universality · Spectrum', cases:[['N=40','40'],['N=100','100'],['N=200','200'],['Regenerate','Generate']]},
    'preferential-attachment.html': {what:'Preferential attachment 是“富者愈富”的网络增长机制，也是 scale-free network 的经典来源。', mechanism:'新节点连接到已有节点的概率与对方 degree 成正比，因此少数早期节点会成为 hub。', watch:'让网络不断长大，看最大 degree、degree distribution 和 hub 结构。', related:'Scale-Free Network · Heavy Tail · Network Growth', cases:[['m=1 tree','m=1'],['m=2 classic','m=2'],['Dense m=4','m=4'],['Restart','Reset']]},
'lattice-boltzmann.html': {what:'Lattice Boltzmann Method 用离散速度分布函数模拟流体。局部碰撞和迁移产生宏观流动。', mechanism:'每步先 BGK collision，再沿 D2Q9 速度方向 streaming；宏观密度和速度由分布函数矩求得。', watch:'看圆柱后方 wake、vorticity 和速度场；提高 inlet speed 或降低黏性观察尾流变复杂。', related:'Fluid Dynamics · LBM · Emergent PDE', cases:[['Laminar flow','Laminar'],['Cylinder wake','Cylinder'],['Faster flow','Fast'],['Reset','Reset']]},
'kpz.html': {what:'KPZ 方程描述带噪声和非线性斜率项的随机界面生长。', mechanism:'扩散项平滑界面，(∇h)² 非线性让倾斜区域生长更快，噪声不断粗糙化表面。', watch:'看 roughness W(t) 如何随时间增长；比较 λ=0 的 Edwards–Wilkinson 与 λ>0 的 KPZ。', related:'Nonequilibrium Growth · Universality · Roughening', cases:[['EW λ=0','EW'],['KPZ classic','KPZ'],['Strong nonlinearity','Strong'],['Flat restart','Flat']]},
    'fhn-field.html': {what:'二维 FitzHugh–Nagumo 把单神经元 excitable dynamics 加上空间扩散，形成传播波、靶波和 spiral wave。', mechanism:'局部 slow–fast 反应负责兴奋/恢复，v 的 diffusion 负责把兴奋传播到邻居。', watch:'点击局部激发看环形波；制造 broken wavefront 看 spiral 是否自发形成。', related:'Excitable Media · Reaction–Diffusion · Spiral Waves', cases:[['Target wave','Target'],['Spiral wave','Spiral'],['Multiple seeds','Multi'],['Reset','Reset']]},
'hopfield.html': {what:'Hopfield network 是 attractor memory 模型。带噪输入通过异步更新向已存储模式收敛。', mechanism:'Hebbian weights 形成多个能量盆地；异步 spin update 单调降低 energy。', watch:'选择一个 stored pattern，加 20–40% 噪声，再运行，看 overlap 是否回升到 1。', related:'Associative Memory · Energy Landscape · Attractor Network', cases:[['Clean memory','Clean'],['20% noise','20%'],['40% noise','40%'],['Random state','Random']]},
'chladni.html': {what:'Chladni 图样对应二维薄板驻波的节点线。真实实验中，沙粒会从振幅较大的区域移动到节点线附近。', mechanism:'不同 (m,n) eigenmodes 的叠加决定位移场；节点满足 mode amplitude≈0。', watch:'切换低阶和高阶模式，看节点线如何从简单十字变成复杂网格与曲线。', related:'Eigenmodes · Standing Waves · Pattern Geometry', cases:[['(1,2)','1,2'],['(2,3)','2,3'],['(3,5)','3,5'],['Mixed mode','Mixed']]},
};

  const STATIC_PAGES = new Set(['mandelbrot.html','random-matrix.html','chladni.html']);

  function findButton(text) {
    const t = String(text).toLowerCase();
    return $$('button').find(b => (b.textContent || '').trim().toLowerCase().includes(t));
  }

  function clickText(text) {
    const b = findButton(text);
    if (b) { b.click(); return true; }
    return false;
  }

  function allControls() {
    return $$('input[type="range"], input[type="number"], select');
  }

  function controlByNearbyText(text) {
    const t = String(text).toLowerCase();
    const nodes = $$('label,.sim-row,.control-row,.control-group,.life-control,.neural-control');
    for (const n of nodes) {
      if ((n.textContent || '').toLowerCase().includes(t)) {
        const c = n.querySelector('input,select');
        if (c) return c;
      }
    }
    return null;
  }

  function setControl(c, value) {
    if (!c) return false;
    if (c.tagName === 'SELECT') {
      const opts = [...c.options];
      const val = String(value).toLowerCase();
      const o = opts.find(x => String(x.value).toLowerCase() === val || (x.textContent || '').toLowerCase().includes(val));
      if (!o) return false;
      c.value = o.value;
    } else {
      let v = Number(value);
      if (!Number.isFinite(v)) return false;
      if (c.min !== '') v = Math.max(v, Number(c.min));
      if (c.max !== '') v = Math.min(v, Number(c.max));
      c.value = String(v);
    }
    c.dispatchEvent(new Event('input', {bubbles:true}));
    c.dispatchEvent(new Event('change', {bubbles:true}));
    return true;
  }

  function setByLabel(label, value) { return setControl(controlByNearbyText(label), value); }
  function setRangeFraction(i, frac) {
    const ranges = $$('input[type="range"]');
    const c = ranges[i];
    if (!c) return false;
    const lo = Number(c.min || 0), hi = Number(c.max || 100);
    return setControl(c, lo + (hi-lo)*frac);
  }

  function resetLike() {
    return ['重置','reset','random','随机','restart','reseed','clear'].some(clickText);
  }

  function togglePlay() {
    const direct = $('#play,#pause,#playPause,#togglePlay,.play-toggle');
    if (direct && direct.tagName === 'BUTTON') { direct.click(); return true; }
    const candidates = $$('button');
    const b = candidates.find(x => /暂停|播放|开始|pause|play|start/i.test(x.textContent || ''));
    if (b) { b.click(); return true; }
    return false;
  }

  function primaryStaticAction() {
    const order = ['generate','生成','render','compute','计算','reseed','随机','reset','重置'];
    for (const t of order) if (clickText(t)) return true;
    return false;
  }

  function applyCase(label) {
    const p = PAGE;
    const l = label.toLowerCase();
    // First prefer an existing native preset/button.
    if (clickText(label)) return;

    // High-confidence page-specific parameter presets using nearby labels where possible.
    if (p === 'percolation.html') {
      const v = l.includes('below') ? .50 : l.includes('near') ? .5927 : l.includes('above') ? .68 : .80;
      setByLabel('p', v) || setRangeFraction(0, (v-.35)/.55); resetLike(); return;
    }
    if (p === 'logistic-map.html') {
      const v = l.includes('2.8') ? 2.8 : l.includes('3.2') ? 3.2 : l.includes('3.5699') ? 3.5699 : 3.9;
      setByLabel('r', v) || setRangeFraction(0, (v-2.5)/1.5); return;
    }
    if (p === 'kauffman-network.html') {
      const v = l.includes('k=1') ? 1 : l.includes('k=2') ? 2 : l.includes('k=4') ? 4 : null;
      if (v) { setByLabel('K', v) || setRangeFraction(0, (v-1)/5); resetLike(); }
      else clickText('扰动') || clickText('perturb'); return;
    }
    if (p === 'hopfield.html') {
      if (l.includes('20%')) setByLabel('noise', .2) || setRangeFraction(0,.2);
      else if (l.includes('40%')) setByLabel('noise', .4) || setRangeFraction(0,.4);
      else if (l.includes('random')) clickText('random');
      else clickText('clean') || resetLike(); return;
    }
    if (p === 'random-matrix.html') {
      const v = l.includes('40')?40:l.includes('100')?100:l.includes('200')?200:null;
      if (v) setByLabel('N',v) || setRangeFraction(0, v/220);
      primaryStaticAction(); return;
    }
    if (p === 'sandpile.html') {
      if (l.includes('center')) { setByLabel('位置','中心'); return; }
      if (l.includes('random')) { setByLabel('位置','随机'); return; }
      resetLike(); return;
    }

    // Generic robust presets: move 1st/2nd sliders, then reinitialize.
    if (/low|sub|stable|laminar|ordered|small|sparse|below/.test(l)) {
      setRangeFraction(0,.20); setRangeFraction(1,.25); resetLike(); return;
    }
    if (/critical|onset|classic|near|bkt|threshold|mid/.test(l)) {
      setRangeFraction(0,.50); setRangeFraction(1,.50); resetLike(); return;
    }
    if (/high|strong|chaotic|dense|fast|active|outbreak/.test(l)) {
      setRangeFraction(0,.80); setRangeFraction(1,.70); resetLike(); return;
    }
    if (/random|noise|reseed|reset|restart|mixed/.test(l)) { resetLike(); return; }

    // Last resort: try any keyword from the case label, else reset.
    for (const word of label.split(/[\s/()]+/)) if (word.length > 2 && clickText(word)) return;
    resetLike();
  }

  function addStyles() {
    if ($('#complex-enhance-style')) return;
    const s = document.createElement('style');
    s.id = 'complex-enhance-style';
    s.textContent = `
      .cx-shortcuts{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-top:10px;font:12px/1.4 ui-monospace,SFMono-Regular,Menlo,monospace;color:#666}
      .cx-key{display:inline-flex;align-items:center;gap:6px;border:1px solid #cfcfc9;background:#fff;padding:5px 8px;border-radius:4px;color:#222}
      .cx-key kbd{font:600 11px ui-monospace,SFMono-Regular,Menlo,monospace;border:1px solid #bbb;border-bottom-width:2px;padding:1px 6px;border-radius:3px;background:#f6f6f3}
      .cx-guide{margin:28px auto 0;max-width:1280px;border-top:2px solid #111;padding-top:18px;color:#111}
      .cx-guide-head{display:flex;justify-content:space-between;gap:18px;align-items:flex-end;margin-bottom:14px;flex-wrap:wrap}
      .cx-guide h2{font:700 18px/1.2 ui-monospace,SFMono-Regular,Menlo,monospace;margin:0;text-transform:uppercase;letter-spacing:.04em}
      .cx-guide-sub{font-size:12px;color:#777;text-transform:uppercase;letter-spacing:.08em}
      .cx-cases{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 18px}
      .cx-case{appearance:none;border:1px solid #111;background:#fff;color:#111;padding:9px 12px;border-radius:2px;cursor:pointer;font:600 12px/1.2 ui-monospace,SFMono-Regular,Menlo,monospace}
      .cx-case:hover,.cx-case:focus-visible{background:#111;color:#fff;outline:none}
      .cx-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));border:1px solid #d8d8d2}
      .cx-block{padding:16px;min-width:0;background:#fff}
      .cx-block+.cx-block{border-left:1px solid #d8d8d2}
      .cx-block h3{margin:0 0 8px;font:700 12px/1.3 ui-monospace,SFMono-Regular,Menlo,monospace;text-transform:uppercase;letter-spacing:.06em;color:#555}
      .cx-block p{margin:0;font-size:13px;line-height:1.65;color:#333}
      .cx-tip{margin-top:12px;padding:12px 14px;background:#f6f6f2;border-left:3px solid #111;font-size:13px;line-height:1.55;color:#333}
      @media(max-width:900px){.cx-grid{grid-template-columns:1fr 1fr}.cx-block:nth-child(3){border-left:0;border-top:1px solid #d8d8d2}.cx-block:nth-child(4){border-top:1px solid #d8d8d2}}
      @media(max-width:560px){.cx-grid{grid-template-columns:1fr}.cx-block+.cx-block{border-left:0;border-top:1px solid #d8d8d2}.cx-case{min-height:44px}.cx-guide{margin-top:20px}}
    `;
    document.head.appendChild(s);
  }

  function addShortcutHint() {
    const host = $('.sim-top > div:first-child, .life-topbar > div:first-child, header > div:first-child, .neural-topbar > div:first-child');
    if (!host || host.querySelector('.cx-shortcuts')) return;
    const d = document.createElement('div');
    d.className = 'cx-shortcuts';
    const spaceLabel = STATIC_PAGES.has(PAGE) ? '主要动作' : '开始 / 暂停';
    d.innerHTML = `<span class="cx-key"><kbd>Space</kbd>${spaceLabel}</span><span class="cx-key"><kbd>R</kbd>重置 / 重新初始化</span>`;
    host.appendChild(d);
  }

  function addGuide(meta) {
    if (!meta || $('.cx-guide')) return;
    const main = $('main') || document.body;
    const guide = document.createElement('section');
    guide.className = 'cx-guide';
    const cases = (meta.cases || []).map(([name, action]) => `<button type="button" class="cx-case" data-cx-case="${name.replace(/"/g,'&quot;')}" data-cx-action="${String(action || name).replace(/"/g,'&quot;')}">${name}</button>`).join('');
    guide.innerHTML = `
      <div class="cx-guide-head"><h2>使用方法</h2><span class="cx-guide-sub">先选经典案例，再改一个参数</span></div>
      <div class="cx-cases">${cases}</div>
      <div class="cx-grid">
        <div class="cx-block"><h3>01 · 这是什么</h3><p>${meta.what}</p></div>
        <div class="cx-block"><h3>02 · 关键机制</h3><p>${meta.mechanism}</p></div>
        <div class="cx-block"><h3>03 · 重点观察</h3><p>${meta.watch}</p></div>
        <div class="cx-block"><h3>04 · 相关概念</h3><p>${meta.related}</p></div>
      </div>
      <div class="cx-tip"><strong>推荐操作：</strong>先选一个经典案例，观察 5–20 秒，再只改一个参数。记录图案、序参量或时间序列的变化。</div>`;
    const footer = $('footer');
    if (footer && footer.parentNode === main) main.insertBefore(guide, footer); else main.appendChild(guide);
    $$('.cx-case', guide).forEach(b => b.addEventListener('click', () => applyCase(b.dataset.cxAction || b.dataset.cxCase)));
  }

  function keyboard() {
    addEventListener('keydown', e => {
      const tag = (e.target && e.target.tagName || '').toLowerCase();
      if (['input','textarea','select','button'].includes(tag) || e.target?.isContentEditable) return;
      if (e.code === 'Space') {
        e.preventDefault();
        e.stopImmediatePropagation();
        if (STATIC_PAGES.has(PAGE)) primaryStaticAction(); else togglePlay() || primaryStaticAction();
      } else if (e.key.toLowerCase() === 'r') {
        e.preventDefault();
        e.stopImmediatePropagation();
        if (!resetLike()) primaryStaticAction();
      }
    }, {capture:true, passive:false});
  }

  function loadGlossary() {
    if (document.querySelector('script[src*="complex-glossary.js"]')) return;
    const script = document.createElement('script');
    script.src = 'assets/js/complex-glossary.js';
    script.defer = true;
    document.body.appendChild(script);
  }

  function normalizePlayButton() {
    const b = $('#play,#pause,#playPause,#togglePlay,.play-toggle') || $$('button').find(x => /暂停|播放|开始|pause|play|start/i.test(x.textContent || ''));
    if (b) {
      b.setAttribute('title', 'Space：开始 / 暂停');
      b.setAttribute('aria-keyshortcuts', 'Space');
    }
  }

  function init() {
    if (window.__complexEnhanceLoaded) return;
    window.__complexEnhanceLoaded = true;
    addStyles();
    addShortcutHint();
    addGuide(META[PAGE]);
    normalizePlayButton();
    keyboard();
    loadGlossary();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, {once:true});
  else init();
})();
