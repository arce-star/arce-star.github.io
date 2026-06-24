---
tags:
  - AI
  - 物理
  - PINNs
  - 课程笔记
date: 2026-06-25
---

# 物理信息神经网络 (PINNs)

> 基于 Raissi, Perdikaris & Karniadakis (2019) 的奠基性论文及后续综述、课程讲义（牛津大学、康奈尔大学、多伦多大学 SciNet）、NVIDIA PhysicsNeMo 文档、DeepXDE 框架、PINNacle 基准测试等资料的系统性整理笔记。

**物理信息神经网络**（Physics-Informed Neural Networks, PINNs）是一类将微分方程（ODE/PDE）的物理定律直接嵌入神经网络损失函数中的深度学习方法。PINNs 以神经网络的自动可微性替代传统的数值离散化，以物理残差最小化替代纯数据驱动的经验风险最小化，从而在**无标签数据**的条件下求解微分方程的正问题和逆问题。

---

## 数学框架

### 一般 PDE 形式

一般的时间依赖或稳态偏微分方程可写为：

$$
\mathcal{F}(u(z); \lambda) = f(z), \quad z \in \Omega
$$

$$
\mathcal{B}(u(z)) = g(z), \quad z \in \partial\Omega
$$

其中各符号含义：

| 符号 | 含义 |
|------|------|
| $z = (x_1, \ldots, x_d, t)$ | 时空坐标向量（$\Omega \subset \mathbb{R}^{d}$ 为空间域，$t$ 为时间） |
| $u(z)$ | 待求的物理量（解函数），如速度、温度、电势 |
| $\mathcal{F}$ | 微分算子（可非线性），如 $\mathcal{F}(u) = u_t + u u_x - \nu u_{xx}$（Burgers 方程） |
| $\lambda = (\lambda_1, \ldots, \lambda_k)$ | 物理参数（如扩散系数 $\nu$、反应速率），在逆问题中为未知量 |
| $f(z)$ | 源项（已知或部分已知） |
| $\mathcal{B}$ | 边界条件 / 初始条件算子 |
| $\partial\Omega$ | 域的边界（含空间边界和时间初始面 $t = 0$） |

### 核心思想

以神经网络 $\hat{u}_\theta(z)$ 逼近真解 $u(z)$（$\theta$ 为网络权重和偏置），通过**自动微分**（Automatic Differentiation, AD）计算 $\hat{u}_\theta$ 关于其输入 $z$ 的各阶导数，代入微分算子 $\mathcal{F}$ 和边界算子 $\mathcal{B}$ 构造残差。训练目标为极小化以下**复合损失函数**：

$$
\mathcal{L}(\theta) = \omega_{\mathcal{F}} \mathcal{L}_{\mathcal{F}}(\theta) + \omega_{\mathcal{B}} \mathcal{L}_{\mathcal{B}}(\theta) + \omega_{\mathcal{I}} \mathcal{L}_{\mathcal{I}}(\theta) + \omega_{d} \mathcal{L}_{d}(\theta)
$$

### 各项损失的定义

#### PDE 残差损失 $\mathcal{L}_{\mathcal{F}}$

在计算域内部采样一组**配点**（collocation points）$\{z_f^{(i)}\}_{i=1}^{N_f} \subset \Omega$，计算微分方程残差的均方误差：

$$
\mathcal{L}_{\mathcal{F}}(\theta) = \frac{1}{N_f} \sum_{i=1}^{N_f} \left\| \mathcal{F}(\hat{u}_\theta(z_f^{(i)}); \lambda) - f(z_f^{(i)}) \right\|^2
$$

其中 $\mathcal{F}(\hat{u}_\theta(z))$ 的计算通过 AD 自动求取 $\hat{u}_\theta$ 关于 $z$ 的偏导数（$\frac{\partial \hat{u}}{\partial x}$、$\frac{\partial^2 \hat{u}}{\partial x^2}$、$\frac{\partial \hat{u}}{\partial t}$ 等），组合形成算子值。AD 计算的是**精确导数**（至机器精度），而非有限差分的截断近似。

#### 边界条件损失 $\mathcal{L}_{\mathcal{B}}$

在边界 $\partial\Omega$ 上采样 $\{z_b^{(i)}\}_{i=1}^{N_b}$，惩罚预测值与指定边界值的偏差：

$$
\mathcal{L}_{\mathcal{B}}(\theta) = \frac{1}{N_b} \sum_{i=1}^{N_b} \left\| \mathcal{B}(\hat{u}_\theta(z_b^{(i)})) - g(z_b^{(i)}) \right\|^2
$$

对 **Dirichlet 边界** $u|_{\partial\Omega} = g$，该项简化为 $\frac{1}{N_b} \sum \|\hat{u}_\theta(z_b^{(i)}) - g(z_b^{(i)})\|^2$。

对 **Neumann 边界** $\frac{\partial u}{\partial n}|_{\partial\Omega} = g$，用 AD 计算法向导数后构造残差。

#### 初始条件损失 $\mathcal{L}_{\mathcal{I}}$

对时间依赖问题，在初始时刻 $t = 0$ 采样 $\{z_i^{(i)}\}_{i=1}^{N_i}$：

$$
\mathcal{L}_{\mathcal{I}}(\theta) = \frac{1}{N_i} \sum_{i=1}^{N_i} \left\| \hat{u}_\theta(x_i, 0) - u_0(x_i) \right\|^2
$$

#### 数据损失 $\mathcal{L}_{d}$（可选）

当有观测数据 $\{(z_d^{(i)}, u_d^{(i)})\}_{i=1}^{N_d}$ 时（逆问题的核心要素）：

$$
\mathcal{L}_{d}(\theta) = \frac{1}{N_d} \sum_{i=1}^{N_d} \left\| \hat{u}_\theta(z_d^{(i)}) - u_d^{(i)} \right\|^2
$$

### 损失权重

$\omega_{\mathcal{F}}, \omega_{\mathcal{B}}, \omega_{\mathcal{I}}, \omega_{d}$ 为各损失项的权重超参数。不恰当的权重分配是 PINNs 训练失败的最常见原因——某一项的梯度可能压倒其他项，导致网络仅满足该约束而忽略其余。

---

## 网络架构

### 基本结构

标准 PINN 使用**全连接前馈神经网络**（MLP）：

$$
h^{(0)} = z
$$

$$
h^{(l)} = \sigma(W^{(l)} h^{(l-1)} + b^{(l)}), \quad l = 1, \ldots, L-1
$$

$$
\hat{u}_\theta(z) = W^{(L)} h^{(L-1)} + b^{(L)}
$$

### 激活函数的选择

PINN 需要至少二阶可微的激活函数（以计算 PDE 中的二阶导数项）。

| 激活函数 | $\sigma(x)$ | 光滑性 | 特点 |
|----------|:----------:|:---:|------|
| **tanh** | $\tanh(x)$ | $C^\infty$ | PINN 文献中**最常用**；有界，导数解析 |
| **正弦 (SIREN)** | $\sin(\omega_0 x)$ | $C^\infty$ | 对高频函数有天然优势；需特殊初始化 |
| **Swish / SiLU** | $x \cdot \sigma(x)$ | $C^\infty$ | 光滑且非单调 |
| **GELU** | $x \cdot \Phi(x)$ | $C^\infty$ | 与 Swish 类似 |
| **ReLU** | $\max(0, x)$ | $C^0$（不足） | 二阶导数为零——**不适于 PINN** |

**关键教训**：ReLU 及其变体在 PINN 中几乎从不使用——它们的二阶及更高阶导数在大多数区域恒为零。

### 配点采样

| 策略 | 说明 | 适用场景 |
|------|------|---------|
| **均匀随机** | 在 $\Omega$ 和 $\partial\Omega$ 上均匀随机采样 | 平滑解、简单域 |
| **Latin Hypercube (LHS)** | 分层抽样确保空间覆盖 | 中小维度（$d \le 10$） |
| **Hammersley / Sobol 序列** | 低差异序列，提供更均匀的覆盖 | 优于纯随机 |
| **自适应采样** | 在残差大的区域增加配点密度 | 含局部锐变的解 |
| **时空因果采样** | 先采早期时间点，逐渐引入后期 | 时间依赖问题 |

---

## 自动微分

### 原理

**自动微分**是 PINN 可行性的**关键技术支柱**。AD 不同于数值微分（有限差分——有截断误差）和符号微分（产生表达式膨胀），而是通过对神经网络的前向计算图应用链式法则，在机器精度上计算导数。

**示例**：对于 Burgers 方程 $u_t + u u_x - \nu u_{xx} = 0$：

1. 输入 $(x, t)$ 前向传播得 $\hat{u} = \hat{u}_\theta(x, t)$
2. 对 $\hat{u}$ 反传一次得 $\frac{\partial \hat{u}}{\partial x}$ 和 $\frac{\partial \hat{u}}{\partial t}$
3. 对 $\frac{\partial \hat{u}}{\partial x}$ 再反传一次得 $\frac{\partial^2 \hat{u}}{\partial x^2}$
4. 组合：残差 $= \frac{\partial \hat{u}}{\partial t} + \hat{u} \cdot \frac{\partial \hat{u}}{\partial x} - \nu \cdot \frac{\partial^2 \hat{u}}{\partial x^2}$

**框架实现**：

| 框架 | AD API | 说明 |
|------|--------|------|
| **PyTorch** | `torch.autograd.grad` | 对任意计算图输出求导于任意输入 |
| **TensorFlow** | `tf.GradientTape` | 记录前向操作，反传求导 |
| **JAX** | `jax.grad`, `jax.jacrev` | 函数式 AD，支持高阶求导 |
| **DeepXDE** | 封装上述后端 | 自动处理配点生成、BC 处理、AD 调用 |

---

## 正问题与逆问题

### 正问题 (Forward Problem)

**给定**：完整的 PDE 算子 $\mathcal{F}$、参数 $\lambda$、边界条件、初始条件。

**求解**：近似解 $\hat{u}_\theta(z)$。

正问题的损失仅含 PDE 残差、边界和初始条件三项。无需任何内部观测数据——"物理"**完全替代**了数据作为监督信号。

**成功求解的经典 PDE**：

| PDE | 类型 | 特征 |
|-----|------|------|
| **Burgers 方程** | 非线性对流-扩散 | 激波形成；验证 PINN 的标准基准 |
| **Navier-Stokes 方程** | 非线性流体力学 | 可恢复压力场而无须压力测量数据 |
| **Poisson 方程** | 线性椭圆 | 静电学、稳态扩散的基础问题 |
| **热方程** | 线性抛物 | 光滑解，PINN 表现良好 |
| **Allen-Cahn 方程** | 非线性相场 | 薄界面、多尺度——挑战 PINN 的谱偏差 |
| **Schrödinger 方程** | 复值量子力学 | 原论文的基准之一 |

### 逆问题 (Inverse Problem)

**给定**：部分观测数据 + PDE 结构（算子 $\mathcal{F}$ 形式已知但部分参数 $\lambda$ 未知）。

**联合求解**：近似解 $\hat{u}_\theta(z)$ + 未知参数 $\lambda$ 的估计。

**关键机制**：将未知参数 $\lambda$ 视为**可训练变量**（与 $\theta$ 同列优化变量）。损失函数为 $\mathcal{L}(\theta, \lambda) = \omega_d \mathcal{L}_d + \omega_{\mathcal{F}} \mathcal{L}_{\mathcal{F}}$——数据拟合提供参数的信息来源，PDE 残差提供正则化和参数的结构一致性约束。

**典型应用**：
- 从速度场稀疏测量中反演流体粘度 $\nu$
- 从位移测量中恢复材料弹性模量
- 从温度场推断未知热源分布
- 地下流动中渗透系数场的识别

---

## 训练策略

### 谱偏差问题

神经网络在训练中**倾向于优先学习低频成分**（F-Principle / Spectral Bias）。NTK 理论给出了精确解释：大特征值对应低频率模式。这意味着 PINN 在捕捉激波、薄界面、高频振荡时极其缓慢甚至完全失败。

### 自适应损失权重

不同损失项的梯度量级可能相差数个数量级，导致训练"偏科"。

| 策略 | 机制 | 代表性工作 |
|------|------|---------|
| **NTK 自适应** | 基于各损失项的 NTK 特征值之和动态调整权重 | Wang et al. (2022) |
| **学习型权重** | 将权重设为可训练参数，与网络权重联合优化 | SA-PINN |
| **DASA** | 内层最大化逐点权重，外层最小化网络损失 | DASA-PINN |
| **梯度归一化** | 在每步计算各损失项的梯度范数，缩放至均衡 | GradNorm |

### 硬约束边界条件

通过构造一个满足边界条件的函数模板来**严格**满足边界条件：

$$
\hat{u}_{\text{hard}}(z, \theta) = A(z) + B(z) \cdot \hat{u}_\theta^{\text{NN}}(z)
$$

其中 $A(z) = g(z)$ 在边界上承担边界值，$B(z) = 0$ 在边界上使神经网络部分不污染边界。

### 因果训练

对于时间依赖的演化型 PDE，遵循物理的因果顺序——先训练早期时间区域，后逐渐引入后期。防止网络在未建立正确的早期解前就试图记住后期。

### 域分解（XPINN / cPINN）

将一个大型复杂域划分为若干子域，每个子域由一个独立的子网络建模，子域间通过界面连续性损失耦合。

---

## 与传统数值方法的对比

| 维度 | PINNs | 有限元 (FEM) / 有限差分 (FDM) |
|------|-------|-------------------------------|
| **网格** | **无网格**——在散乱配点上工作 | 需要结构化/非结构化网格生成 |
| **离散化** | 连续神经网络函数逼近器 | 显式空间/时间离散化 |
| **导数** | 自动微分（机器精度） | 数值近似（截断误差 $O(h^k)$） |
| **逆问题** | 统一框架：参数作为可训练变量 | 需在外部优化循环中反复调用正演求解器 |
| **复杂几何** | 自然处理不规则域 | 需要复杂的网格生成 |
| **训练成本** | 高（复杂 3D 问题需要 GPU 小时） | 简单问题适中 |
| **推理/评估成本** | 训练后几乎实时 | 每组新参数需重新求解 |
| **精度** | 通常低于高分辨率 FEM | 完善问题的黄金标准 |
| **高维问题** | 相对于网格方法有潜在优势 | 维数灾难（网格点数 $O(N^d)$） |

**互补性大于替代性**：PINN 在多物理场耦合逆问题、实时代理建模和高维 PDE 中具有优势，但在纯精度至上的大规模正演模拟中，传统网格方法仍占主导。

---

## 局限性与注意事项

### 主要局限

1. **谱偏差**：网络偏好低频成分；高频解极难学习
2. **训练不稳定性**：多损失项竞争导致训练对权重极其敏感
3. **长时程积分**：时间依赖问题在长时间上的误差累积显著
4. **大域求解困难**：单个网络表达大域上复杂解的能力受网络容量和优化难度的双重约束
5. **精度上限**：PINN 的精度通常不及精细网格上的有限元/有限差分
6. **泛化受限**：训练出的 PINN 是单一解的代理模型——改变条件需要重新训练

### 常见误区

1. **"PINN 不需要训练数据"**：正问题中无需数据，但逆问题必须有足够的观测数据
2. **"AD 自动处理一切"**：若激活函数不可微（ReLU），AD 返回的零导数在物理上是无意义的
3. **"更多的配点 = 更好的解"**：配点数超过某阈值后边际收益递减
4. **"硬约束总优于软约束"**：不良设计的 $B(z)$ 函数可引入谱病态性
5. **"PINN 可替代传统求解器"**：在精度优先的应用中，PINN 目前尚不能匹敌传统求解器

---

## 手动可验算示例：Poisson 方程的 PINN

### 问题定义

一维 Poisson 方程：$-u''(x) = f(x)$，$x \in [0, 1]$，$u(0) = u(1) = 0$。

取 $f(x) = \pi^2 \sin(\pi x)$，精确解为 $u(x) = \sin(\pi x)$。

### 神经网络（极度简化：单参数线性网络）

设近似解为 $\hat{u}(x) = \theta \cdot x(1-x)$，其中 $\theta$ 为唯一的可训练参数，$B(x) = x(1-x)$ 在 $x = 0, 1$ 处为零（硬约束边界条件）。

### 解析计算

PDE 残差：

$$
r(x; \theta) = -\hat{u}''(x) - f(x) = -(-2\theta) - \pi^2 \sin(\pi x) = 2\theta - \pi^2 \sin(\pi x)
$$

### 损失函数

在 $[0, 1]$ 上取三个配点 $x = 0.25, 0.5, 0.75$：

| $x_i$ | $\pi^2 \sin(\pi x_i)$ | $r(x_i; \theta) = 2\theta - \pi^2 \sin(\pi x_i)$ |
|:---:|:---:|:---:|
| $0.25$ | $6.979$ | $2\theta - 6.979$ |
| $0.50$ | $9.870$ | $2\theta - 9.870$ |
| $0.75$ | $6.979$ | $2\theta - 6.979$ |

令 $\frac{d\mathcal{L}}{d\theta} = 0$，解得 $\theta \approx 3.971$。

### 评估

| $x$ | $\hat{u}(x)$ | $u_{\text{true}}(x) = \sin(\pi x)$ | 误差 |
|:---:|:---:|:---:|:---:|
| $0.25$ | $0.745$ | $0.707$ | $+0.038$ |
| $0.50$ | $0.993$ | $1.000$ | $-0.007$ |
| $0.75$ | $0.745$ | $0.707$ | $+0.038$ |

仅使用一个自由参数和三个配点，PINN 已将全局最大误差控制在约 5% 以内。

---

## 扩展与前沿方向

### 算子学习（Operator Learning）

**DeepONet**（2019）和**傅里叶神经算子 (FNO)**（2020）将 PINN 的"单一解学习"扩展为**解算子**的学习——训练后，可对不同的边界条件/初始条件在零额外成本下生成解。

### 变分 PINN（VPINN / hp-VPINN）

将 PDE 的**弱形式**（变分原理）作为损失，而非强形式的逐点残差。

### 分数阶 PINN (fPINN)

将 PINN 推广至含**分数阶导数**的 PDE。标准链式法则不适用于分数阶微积分。

### 软件生态

| 框架 | 后端 | 特点 |
|------|------|------|
| **DeepXDE** | TF/PyTorch/JAX/PaddlePaddle | 最全面的 PINN 库；含大量示例和文档 |
| **NVIDIA Modulus (PhysicsNeMo)** | PyTorch | 工业级；含 PhysicsInformer 抽象 |
| **SciANN** | Keras/TensorFlow | 科学计算的 Keras 封装 |
| **jinns** | JAX | 充分利用 JAX 的 vmap、pmap、AD 优势 |
| **PINA** | PyTorch | 轻量、模块化、面向 SciML |

---

## 术语速查

| 术语 | 英文 | 简要含义 |
|------|------|---------|
| 物理信息神经网络 | Physics-Informed Neural Network | 将 PDE 残差作为损失函数的一部分进行训练的神经网络 |
| 配点 | Collocation Points | 域内或边界上采样用于计算损失的坐标点 |
| PDE 残差 | PDE Residual | $\mathcal{F}(\hat{u}) - f$，度量近似解偏离方程的程度 |
| 自动微分 | Automatic Differentiation | 通过计算图的链式法则精确计算导数 |
| 正问题 | Forward Problem | 给定完整物理定律和边界条件，求解系统行为 |
| 逆问题 | Inverse Problem | 从稀疏数据中反演未知物理参数 |
| 谱偏差 | Spectral Bias / F-Principle | 神经网络优先学习低频成分的倾向 |
| 神经正切核 | Neural Tangent Kernel (NTK) | 无限宽极限下描述网络训练动力学的核矩阵 |
| 软约束 | Soft Constraint | 边界/初始条件作为损失惩罚项 |
| 硬约束 | Hard Constraint | 通过构造 ansatz 严格满足边界条件 |
| 因果训练 | Causal Training | 按时间因果顺序逐段训练以稳定时间依赖问题 |
| 域分解 | Domain Decomposition (XPINN) | 将大域拆分、各子域独立网络并行训练 |
| 算子学习 | Operator Learning | 学习 PDE 解算子（函数→函数的映射） |
| SIREN | Sinusoidal Representation Networks | 使用正弦激活函数以改善高频表示能力 |
| L-BFGS | Limited-memory BFGS | 常用于 PINN 微调阶段的拟牛顿优化器 |
