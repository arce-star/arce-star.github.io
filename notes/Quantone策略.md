---
tags:
  - 量化
  - 期权
  - 策略回测
  - 课程笔记
date: 2026-06-27
---

# Quantone — BTC / QQQ / SQQQ 期权卖方策略

> 基于 TradingView 信号 + 历史期权数据的自动化期权卖方回测系统。代码仓库：[github.com/arce-star/Quantone](https://github.com/arce-star/Quantone)

---

## 策略概览

| 策略 | 标的 | 类型 | 核心逻辑 |
|------|------|------|----------|
| **BTC Single Leg v9** | BTC | 裸卖期权 | 卖 Δ≈0.30 Call/Put，触发对冲 |
| **BTC Credit Spread v8** | BTC | 信用价差 | 卖 Δ≈0.30 + 买 Δ≈0.10 保护 |
| **BTC Short Strangle v4** | BTC | 卖出跨式 | 同时卖 Call + Put，日线对冲 |
| **QQQ Short Strangle v4** | QQQ | 卖出跨式 | 布林带触发，同时卖 Call+Put |
| **QQQ Covered Call v3** | QQQ | 备兑看涨 | 持股卖 Call，Δ≈0.30，止盈 50% |
| **SQQQ Call Spread** | SQQQ | 看涨价差 | 卖 Δ≈0.30 + 买 Δ≈0.10，DTE≈21 天 |

---

## 信号引擎

BTC 策略共享同一套 TradingView 信号体系（2 小时 K 线）：

```
布林带(20, 2σ) + HV 分位(前 30%) + CCI(<101) + K线形态确认
  → SELL: 突破上轨 + 阴线 → 卖 Call
  → BUY:  跌破下轨 + 阳线 → 卖 Put
```

QQQ 策略则在 Python 内独立计算开仓条件，不依赖外部信号。

---

## BTC 单腿裸卖 v9

**最新版本**，直接使用 Deribit 历史期权数据回测。

核心参数：
- 信号频率：2H K 线，信号发出后 5 分钟内入场
- DTE：24 天（当天 + 23 天）
- 目标 Delta：0.30
- 每次 1 张，不设止损（裸卖全风险敞口）
- 对冲阈值：组合 Delta 超 ±0.30 触发对冲

```python
# 核心逻辑简化
if signal == "SELL":
    target_dte = min(24, max_dte)  # 不超过 24 天
    option = find_option(chain, "call", delta_target=0.30, dte=target_dte)
    sell_to_open(option, 1)
elif signal == "BUY":
    option = find_option(chain, "put", delta_target=-0.30, dte=target_dte)
    sell_to_open(option, 1)
```

---

## QQQ 卖出跨式 v4

无底仓的纯期权卖方策略。同时卖出虚值 Call 和虚值 Put，每日通过买卖 QQQ 股票对冲 Delta 风险，赚取时间价值衰减（Theta）。

### 开仓条件（全部满足才触发）

| 条件 | 参数 | 含义 |
|:-----|:----:|:------|
| HV30 分位数 ≥ 20% | `HV_PERCENTILE_MIN = 20` | 波动率不在历史最低 20% |
| ATM IV 分位数 > 10% | `IV_PERCENTILE_MIN = 10` | 权利金足够厚 |
| 价格触及布林带 | `BB(20, 2σ)` | 价格在 ±0.5% 范围内触及上下轨 |
| 有可用合约 | — | Delta 和 DTE 符合要求的 Call/Put |

### 合约选择

| 项目 | 数值 |
|:-----|:----:|
| 张数 | 3 张 Call + 3 张 Put |
| 到期天数 | 30–40 天 |
| 目标 Delta | 0.175 (范围 0.15–0.20) |
| 成交价 | Bid 价（卖出）/ Ask 价（平仓） |

### Delta 对冲

$$
\text{组合 Delta} = (-1 \times \text{CallDelta} + |\text{PutDelta}|) \times \text{合约张数}
$$

- CallDelta 带负号（卖 Call 是负 Delta 敞口）
- PutDelta 取绝对值（卖 Put 是正 Delta 敞口）

$$
\text{目标股数} = -\text{round}(\text{组合 Delta} \times 100)
$$

当 |组合 Delta| > 0.2 且调整量 ≥ 6 股时触发对冲。

### 平仓规则

| 情形 | 条件 |
|:-----|:----:|
| 提前止盈 | 权利金盈利 ≥ 70% |
| 到期平仓 | 剩余 ≤ 7 天（Gamma 风险急剧放大） |

### PnL 核算

$$
\text{最终资产} = \text{初始资金} + \text{期权净盈亏} + \text{累计对冲净盈亏}
$$

其中期权净盈亏 = 总权利金收入 − 总期权平仓成本。

---

## QQQ 备兑看涨 v3

持股 100 股 QQQ + 卖出虚值 Call，赚取权利金增强收益。

- 目标 Delta：0.30
- 止盈：权利金盈利 ≥ 50% 时平仓
- 到期前 7 天强制平仓换月

---

## SQQQ 看涨价差

卖 Δ≈0.30 的 Call + 买 Δ≈0.10 的 Call 做保护，限定最大亏损。

- DTE：约 21 天
- 最大亏损：行权价差 − 净权利金收入

---

## 数据依赖

策略运行需要以下数据（不包含在仓库中）：
- BTC 期权元数据 `btc_options_meta.csv`
- DTE24 期权链 `_cache/dte24_daily_chain.parquet`
- BTC 现货 15 分钟 K 线
- TradingView 导出的 2h/15m 数据

---

## 风险声明

期权交易存在重大风险。本仓库仅用于回测研究和学习，不构成投资建议。
