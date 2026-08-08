# 03 — Decision Engine

JudgmentOS 的主循环不是任务管理。

它是一条把 **不确定性 → 证据 → 决定 → 现实反馈 → 判断更新** 连起来的引擎。

```
GOAL
 ↓
UNDERSTAND
 ↓
MAP UNCERTAINTIES
 ↓
GENERATE MILESTONES
 ↓
GATHER EVIDENCE
 ↓
UPDATE BELIEFS
 ↓
DECISION POINT
 ↓
DECIDE / GATHER MORE EVIDENCE
 ↓
ACTION / EXPERIMENT
 ↓
REAL-WORLD FEEDBACK
 ↓
UPDATE JUDGMENT
 ↓
NEXT MILESTONE
```

---

## 1. GOAL

我们到底想实现什么？

系统第一件事不是生成任务。

而是确认：

- Goal
- Success condition
- Constraints
- Deadline
- User priorities

例如：

> Goal：两周内做出一个自己真正会使用的 JudgmentOS MVP。

这里尤其要区分：

**Goal ≠ Plan。**

「做一个 Next.js App」是 plan，不是 goal。

---

## 2. MAP UNCERTAINTIES

现在最不知道什么？

这是 Engine 的核心。

系统应该问：

- What must be true for this goal to succeed?
- What do we currently not know?
- Which unknown could invalidate everything downstream?

然后排序：

```
U1  ██████████ Critical
U2  ███████
U3  ███
```

Milestone 不从 Todo 产生。

Milestone 从 Uncertainty 产生。

> **Milestones are generated from uncertainties, not tasks.**

---

## 3. GENERATE MILESTONES

针对最高价值的 Unknown：

```
Unknown
 ↓
What information would reduce it?
 ↓
How can reality provide that information?
 ↓
Milestone
```

例如：

**Unknown**  
用户真正需要的是 Decision Management，还是普通 Productivity Tool？

↓

**Evidence needed**  
真实使用过程中，卡点是否发生在 decision points。

↓

**Milestone**  
用 JudgmentOS 方法管理一个真实项目 7 天。

这里已经体现原则：

**Milestone = Learning Mechanism.**

---

## 4. GATHER EVIDENCE

系统先研究，用户再挑战。

每条信息必须有状态：

- FACT
- ASSUMPTION
- INFERENCE
- OPINION

以及元数据：

- SOURCE
- CONFIDENCE
- LAST UPDATED
- CHALLENGED BY USER?

用户可以：

- Challenge
- Correct
- Add Evidence
- Accept

系统根据变化重新判断。

---

## 5. DECISION POINT

这是整个 Engine 最重要的部分之一。

AI 不能永远研究。

每次都必须判断：

> Do we have enough information to act?

然后只有三个结果：

- **A.** Gather more evidence
- **B.** Make provisional decision
- **C.** Freeze decision

### OPEN QUESTION

> Enough evidence 到底是什么意思？

现在不要解决。

这是理论未来真正需要发展的地方。

---

## 6. ACTION / EXPERIMENT

做出决定之后，不是：

```
Decision → Done
```

而是：

```
Decision
 ↓
Action
 ↓
Reality
```

一个决定真正的测试不是：

> AI 觉得它很好。

而是：

> 现实世界发生了什么？

---

## 7. REAL-WORLD FEEDBACK

每一个 Milestone 结束必须回答：

- What happened?
- What did we expect?
- What actually happened?
- What did we learn?
- Which assumption changed?
- Did confidence increase or decrease?

甚至：

> 「我们的判断错了。」

也应该是一个成功完成的 Milestone。

因为我们获得了信息。

---

## 8. UPDATE JUDGMENT

这是 JudgmentOS 和普通 AI Agent 真正开始分开的地方。

系统不只更新：

- Project state

还更新：

- User Judgment History

例如长期可能发现，User repeatedly：

- underestimates implementation time
- overestimates downside risk
- waits too long before customer validation
- makes strong technical judgments

以后 AI 面对新的 Decision，可以说：

> 过去 12 个类似决策中，你有 7 次高估了「做错以后需要完全重来」的概率。

这时候 JudgmentOS 才真正开始拥有复利。

---

## Human Override Layer

贯穿整个 Engine。

任何阶段用户都可以：

- Challenge AI
- Modify milestone
- Delete milestone
- Add milestone
- Change deadline
- Reject recommendation
- Reopen decision

但系统不能只是：

> OK.

而应该：

> You can do this.
>
> Here are the consequences I expect:
>
> **Benefit:** ...
>
> **Risk:** ...
>
> **Unknown introduced:** ...
>
> Proceed?

AI 不控制用户。

AI 让代价变得可见。

这可能成为 JudgmentOS 最核心的 UX 原则之一。

---

## AI Scaling Test

对 Decision Engine 每一步问：

> Horse harness or driving system?

| 能力 | 更像什么 | 备注 |
| --- | --- | --- |
| AI 帮用户 Google 资料 | Harness | 容易被更强模型吞掉 |
| 记录真实世界反馈 | Driving system | 连接现实，长期有价值 |
| 生成 Milestone | 可能被吞掉 | 基础模型本来就会 |
| 让 Milestone 绑定明确 uncertainty | Framework | 更可能长期存在 |
| AI 给 Decision | 容易被吞掉 | 智能本身可替代 |
| 明确谁拥有最终 Decision，以及承担什么 Tradeoff | Agency layer | 更耐久 |

这会逼我们不断把产品从：

> AI 能帮你做什么

推向：

> 人与越来越强的 AI 应该如何共同做决策。
