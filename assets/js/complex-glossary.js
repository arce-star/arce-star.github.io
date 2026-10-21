(() => {
  'use strict';

  const TERMS = [
    ['Live Experiments','实时实验','可以直接操作参数、初始条件或演化状态的实验。'],
    ['Local Rules','局部规则','每个单元只依据附近信息进行更新。'],
    ['Emergent Order','涌现有序','大量局部相互作用产生的宏观有序结构。'],
    ['Cellular Automata','元胞自动机','规则网格上的单元按局部邻域规则同步或异步更新。'],
    ['Neural Cellular Automata','神经元胞自动机','用共享神经网络学习局部更新规则的元胞自动机。'],
    ['Neural CA','神经元胞自动机','用共享神经网络作为细胞局部更新规则。'],
    ['Continuous CA','连续元胞自动机','细胞状态或更新时间取连续值的元胞自动机。'],
    ['Elementary CA','初等元胞自动机','一维二值元胞自动机，每格由自身和左右邻居决定下一状态。'],
    ['Rule Space','规则空间','所有候选局部更新规则组成的集合。'],
    ['Rule Scan','规则扫描','批量运行不同规则并比较长期行为。'],
    ['Universal Computation','通用计算','能够模拟任意可计算过程的计算能力。'],
    ['Artificial Life','人工生命','用计算模型研究生长、自组织、适应和演化。'],
    ['Morphogenesis','形态发生','局部相互作用逐步生成整体形态的过程。'],
    ['Regeneration','再生','系统受损后恢复结构或功能的能力。'],
    ['Hidden Channels','隐藏通道','不直接显示、用于内部存储和传递信息的状态维度。'],
    ['Residual Update','残差更新','在原状态上增加一个更新量，而不是直接覆盖状态。'],
    ['Kernel','卷积核','用于汇总局部邻域信息的一组权重。'],
    ['Seed','种子初态','用于启动生长或演化的初始局部结构。'],

    ['Pattern Formation','模式形成','均匀或随机状态自发形成条纹、斑点、螺旋等结构的过程。'],
    ['Statistical Physics','统计物理','用概率规律连接大量微观自由度与宏观性质。'],
    ['Statistical Mechanics','统计力学','从微观状态统计推导能量、温度和相变等宏观规律。'],
    ['Phase Transition','相变','控制参数变化时，系统宏观状态发生定性改变。'],
    ['Continuous Phase Transition','连续相变','序参量连续变化、临界涨落显著增强的相变。'],
    ['Criticality','临界性','系统在相变临界点附近表现出的强涨落和尺度行为。'],
    ['Self-Organized Criticality','自组织临界性','系统通过驱动与耗散自行接近临界状态。'],
    ['SOC','自组织临界性','Self-Organized Criticality 的缩写。'],
    ['Nonequilibrium','非平衡','存在持续驱动、耗散或概率流的状态。'],
    ['Universality','普适性','不同微观模型在大尺度上出现相同临界规律。'],
    ['Order Parameter','序参量','区分不同宏观相或有序程度的量。'],
    ['Domain Coarsening','畴粗化','不同相的区域随时间长大、界面逐渐减少。'],
    ['Coarsening','粗化','结构的典型空间尺度随时间增大的过程。'],
    ['Spinodal Decomposition','旋节分解','不稳定混合态自发分离成不同相的过程。'],
    ['Phase Field','相场','用连续场变量描述不同相及其界面的方法。'],
    ['Quench','淬火','突然改变温度或控制参数，使系统进入非平衡演化。'],
    ['Monte Carlo','蒙特卡洛','利用随机抽样或随机更新计算统计性质的方法。'],
    ['Metropolis','梅特罗波利斯算法','根据能量差和温度概率接受状态更新的蒙特卡洛方法。'],
    ['Avalanche','雪崩事件','局部变化连续触发后续变化形成的级联。'],
    ['Power Law','幂律','满足 P(x)∝x^-α 一类关系，通常表示缺少单一典型尺度。'],
    ['Absorbing State','吸收态','系统进入后无法依靠自身随机动力学离开的状态。'],
    ['Directed Percolation','有向渗流','带方向的渗流过程，也是许多吸收态相变的普适类。'],
    ['BKT','BKT 相变','二维连续对称系统中由涡旋束缚与解缚控制的相变。'],
    ['Vortex','涡旋','相位或速度场围绕核心旋转的拓扑结构。'],

    ['Reaction-Diffusion','反应扩散','局部反应与空间扩散共同决定场的演化。'],
    ['Reaction–Diffusion','反应扩散','局部反应与空间扩散共同决定场的演化。'],
    ['PDE','偏微分方程','含空间或时间偏导数的连续场方程。'],
    ['ODE','常微分方程','用单一自变量描述连续状态演化的微分方程。'],
    ['Wave Equation','波动方程','描述波传播、反射和干涉的偏微分方程。'],
    ['Boundary Conditions','边界条件','规定系统边缘如何响应，例如固定、周期或开放边界。'],
    ['Interference','干涉','多个波叠加后相互增强或抵消。'],
    ['Standing Wave','驻波','具有固定节点和腹部的波形。'],
    ['Nodal Set','节点集','场值为零或接近零的点、线或面组成的集合。'],
    ['Eigenmode','本征模','满足系统边界条件并具有确定本征频率的振动模式。'],
    ['Excitable Medium','可激发介质','超过阈值后产生大响应并经历恢复期的空间系统。'],
    ['Excitable Media','可激发介质','超过阈值后产生大响应并经历恢复期的空间系统。'],
    ['Slow-Fast Dynamics','快慢动力学','不同时间尺度变量共同产生的动力学。'],
    ['Slow–Fast Dynamics','快慢动力学','不同时间尺度变量共同产生的动力学。'],
    ['Spiral Wave','螺旋波','波前围绕旋转核心持续传播形成的结构。'],
    ['Spiral Waves','螺旋波','波前围绕旋转核心持续传播形成的结构。'],
    ['Refractory Period','不应期','受到激发后暂时难以再次被激发的恢复阶段。'],

    ['Fluid Dynamics','流体动力学','研究流体速度、压力、涡旋和输运的动力学。'],
    ['Lattice Boltzmann Method','格子玻尔兹曼方法','通过离散速度分布的碰撞和迁移模拟流体。'],
    ['LBM','格子玻尔兹曼方法','Lattice Boltzmann Method 的缩写。'],
    ['D2Q9','二维九速度模型','二维格子玻尔兹曼中最常用的九个离散速度方向。'],
    ['BGK','BGK 碰撞模型','用单一松弛时间把分布函数拉回局部平衡的碰撞模型。'],
    ['Streaming','迁移','分布函数沿离散速度方向移动到相邻格点。'],
    ['Collision','碰撞','局部分布函数向平衡分布松弛的步骤。'],
    ['Vorticity','涡量','描述局部流体旋转强度和方向的量。'],
    ['Wake','尾迹','物体后方由流动分离形成的速度和涡旋结构。'],
    ['Reynolds Number','雷诺数','惯性效应与黏性效应的相对强度。'],
    ['Viscosity','黏性','流体抵抗速度梯度的性质。'],

    ['Percolation','渗流','研究随机占据或随机连接何时形成贯穿结构。'],
    ['Spanning Cluster','贯穿团簇','从系统一侧连接到另一侧的连通团簇。'],
    ['Giant Component','巨型连通分量','包含有限比例节点的最大连通部分。'],
    ['Connectivity','连通性','节点或格点能否通过路径相互到达。'],
    ['Network Percolation','网络渗流','研究随机删边或删点时巨型连通分量的形成与崩溃。'],
    ['Network Robustness','网络鲁棒性','网络在节点或边损坏后保持连接与功能的能力。'],
    ['Preferential Attachment','优先连接','新节点更倾向连接到高度节点的网络增长机制。'],
    ['Scale-Free Network','无标度网络','度分布重尾、常出现少数高度枢纽的网络。'],
    ['Small-World','小世界','同时具有较短平均路径和较高局部聚类的网络结构。'],
    ['Small World','小世界','同时具有较短平均路径和较高局部聚类的网络结构。'],
    ['Rewiring','重连','改变网络边的连接对象。'],
    ['Degree','度','一个节点直接连接的边数。'],
    ['Hub','枢纽节点','度明显高于普通节点的网络节点。'],
    ['Heavy Tail','重尾','大数值事件出现概率明显高于指数衰减分布。'],

    ['Synchronization','同步','多个振子或节点逐渐形成共同频率或相位关系。'],
    ['Mean Field','平均场','用系统整体平均影响近似个体间复杂相互作用。'],
    ['Coupling','耦合','一个自由度的状态会影响另一个自由度。'],
    ['Flocking','集群运动','个体通过局部相互作用形成共同运动方向。'],
    ['Active Matter','活性物质','由持续消耗能量并自主运动的单元组成的非平衡系统。'],
    ['Agent','个体','基于局部规则独立更新状态的模拟单元。'],
    ['Noise','噪声','随机扰动或随机更新项。'],
    ['Feedback','反馈','系统输出反过来影响后续输入或更新。'],

    ['Chaos','混沌','确定性系统对初始条件高度敏感的长期非周期行为。'],
    ['Attractor','吸引子','长期演化后轨迹趋近的一组状态。'],
    ['Strange Attractor','奇异吸引子','具有分形结构并承载混沌轨迹的吸引子。'],
    ['Bifurcation','分岔','参数变化导致长期动力学结构发生定性改变。'],
    ['Lyapunov Exponent','李雅普诺夫指数','衡量相邻轨迹平均指数分离或收敛速率的量。'],
    ['Sensitive Dependence','初值敏感性','极小初值差异随时间被快速放大。'],
    ['Phase Space','相空间','用系统全部状态变量作为坐标构成的空间。'],
    ['Phase Portrait','相图','动力系统轨迹在相空间中的几何表示。'],
    ['Fixed Point','不动点','演化后保持不变的状态。'],
    ['Limit Cycle','极限环','系统长期收敛到的稳定周期轨道。'],
    ['Fractal','分形','在多个尺度上具有相似或非整数维几何结构的集合。'],
    ['Random Walk','随机游走','每一步方向或位移由随机规则决定的运动。'],
    ['Escape Time','逃逸时间','迭代轨迹超过指定阈值前经历的步数。'],

    ['Associative Memory','联想记忆','从不完整或带噪输入恢复已存储模式的记忆机制。'],
    ['Energy Landscape','能量景观','用能量函数表示状态空间中稳定盆地和势垒的结构。'],
    ['Hebbian','赫布学习','同时活跃的单元增强连接的经典学习规则。'],
    ['Hamming Distance','汉明距离','两个离散状态中不同位置的数量。'],
    ['Boolean Network','布尔网络','节点状态为 0/1 并通过逻辑函数更新的网络。'],
    ['Truth Table','真值表','列出所有输入组合及对应逻辑输出的表。'],
    ['Edge of Chaos','混沌边缘','有序与混沌动力学之间的过渡区域。'],

    ['Random Matrix Theory','随机矩阵理论','研究随机矩阵特征值和特征向量统计规律的理论。'],
    ['RMT','随机矩阵理论','Random Matrix Theory 的缩写。'],
    ['Spectrum','谱','矩阵本征值或算符本征值的集合。'],
    ['Wigner Semicircle','维格纳半圆律','大随机对称矩阵本征值密度的经典极限分布。'],

    ['Growth Function','生长函数','把局部感知值映射成状态增长或衰减速率的函数。'],
    ['Growth','生长','系统尺寸、界面高度或结构随时间增加的过程。'],
    ['Interface','界面','两个区域、相或介质之间的边界。'],
    ['Interfaces','界面','两个区域、相或介质之间的边界。'],
    ['Instability','不稳定性','微小扰动会随时间增长的状态。'],
    ['Fitness','适应度','模型中表示个体相对适应程度的标量。'],
    ['Phase Map','相图','用控制参数坐标标出不同长期宏观行为的图。'],
    ['Parameter Space','参数空间','用模型参数作为坐标构成的空间。'],
    ['Complex Dynamics','复动力系统','研究复数变量迭代与长期轨迹结构的动力系统。']
  ];

  const entries = TERMS.slice().sort((a,b) => b[0].length - a[0].length);
  const byKey = new Map(entries.map(e => [e[0].toLowerCase(), e]));
  const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp('\\b(' + entries.map(e => esc(e[0])).join('|') + ')\\b(?!\\s*[（(][\\u3400-\\u9fff])', 'gi');
  const SKIP = new Set(['SCRIPT','STYLE','NOSCRIPT','TEXTAREA','INPUT','SELECT','OPTION','CODE','PRE','KBD','SVG','CANVAS']);

  function addStyle() {
    if (document.getElementById('cx-glossary-style')) return;
    const s = document.createElement('style');
    s.id = 'cx-glossary-style';
    s.textContent = `
      .cx-term{border-bottom:1px dotted #888;cursor:help;text-decoration:none;outline:none}
      .cx-term:focus-visible{border-bottom-color:#111;background:#f2f2ee}
      #cx-glossary-tip{position:fixed;z-index:9999;max-width:min(320px,calc(100vw - 24px));padding:9px 11px;border:1px solid #222;background:#111;color:#fff;font:12px/1.55 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;box-shadow:0 4px 18px rgba(0,0,0,.12);pointer-events:none;opacity:0;transform:translateY(3px);transition:opacity .08s ease,transform .08s ease}
      #cx-glossary-tip.show{opacity:1;transform:none}
      @media (prefers-reduced-motion:reduce){#cx-glossary-tip{transition:none}}
    `;
    document.head.appendChild(s);
  }

  function processTextNode(node) {
    if (!node || !node.nodeValue || !node.nodeValue.trim()) return;
    const parent = node.parentElement;
    if (!parent || SKIP.has(parent.tagName) || parent.closest('.cx-term')) return;
    const text = node.nodeValue;
    pattern.lastIndex = 0;
    if (!pattern.test(text)) return;
    pattern.lastIndex = 0;
    const frag = document.createDocumentFragment();
    let last = 0;
    text.replace(pattern, (match, raw, offset) => {
      if (offset > last) frag.appendChild(document.createTextNode(text.slice(last, offset)));
      const e = byKey.get(raw.toLowerCase());
      if (!e) { frag.appendChild(document.createTextNode(match)); last = offset + match.length; return match; }
      const span = document.createElement('span');
      span.className = 'cx-term';
      span.tabIndex = 0;
      span.dataset.tip = e[2];
      span.setAttribute('aria-label', `${raw}，${e[1]}。${e[2]}`);
      span.textContent = `${raw}（${e[1]}）`;
      frag.appendChild(span);
      last = offset + match.length;
      return match;
    });
    if (last < text.length) frag.appendChild(document.createTextNode(text.slice(last)));
    node.parentNode.replaceChild(frag, node);
  }

  function process(root=document.body) {
    if (!root) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(processTextNode);
  }

  function tooltip() {
    let tip = document.getElementById('cx-glossary-tip');
    if (!tip) {
      tip = document.createElement('div');
      tip.id = 'cx-glossary-tip';
      tip.setAttribute('role','tooltip');
      document.body.appendChild(tip);
    }
    let current = null;
    const place = el => {
      const r = el.getBoundingClientRect();
      tip.textContent = el.dataset.tip || '';
      tip.classList.add('show');
      const tr = tip.getBoundingClientRect();
      let left = r.left + r.width/2 - tr.width/2;
      left = Math.max(8, Math.min(innerWidth - tr.width - 8, left));
      let top = r.bottom + 8;
      if (top + tr.height > innerHeight - 8) top = Math.max(8, r.top - tr.height - 8);
      tip.style.left = `${left}px`;
      tip.style.top = `${top}px`;
      current = el;
    };
    const hide = () => { tip.classList.remove('show'); current = null; };
    document.addEventListener('mouseover', e => { const el=e.target.closest?.('.cx-term'); if(el) place(el); });
    document.addEventListener('mouseout', e => { if(e.target.closest?.('.cx-term')) hide(); });
    document.addEventListener('focusin', e => { const el=e.target.closest?.('.cx-term'); if(el) place(el); });
    document.addEventListener('focusout', e => { if(e.target.closest?.('.cx-term')) hide(); });
    document.addEventListener('click', e => {
      const el=e.target.closest?.('.cx-term');
      if (!el) { hide(); return; }
      e.stopPropagation();
      if (current === el && tip.classList.contains('show')) hide(); else place(el);
    });
    addEventListener('scroll', hide, {passive:true});
    addEventListener('resize', hide);
  }

  function init() {
    if (window.__complexGlossaryLoaded) return;
    window.__complexGlossaryLoaded = true;
    addStyle();
    process();
    tooltip();
    setTimeout(() => process(), 300);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, {once:true});
  else init();
})();
