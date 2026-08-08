# JudgmentOS（Working Title）Product Definition Brief (MVP v1)

****

先做文档：

# System Design Document（技术架构：前端、数据库、LLM、RAG、搜索、状态机等）。
# Prompt & Decision Engine Spec（AI 的核心推理流程，包括如何拆分 Milestone、如何区分 Fact/Assumption、如何计算 Confidence、何时建议增加或删除 Milestone）。

另有：
    00-vision.md
    01-product-philosophy.md
    02-product-brief.md
    03-system-design.md
    04-decision-engine.md
    05-ai-constitution.md
    06-ui-principles.md
    07-roadmap.md
---

# Vision

> **Build Judgment, Not Just Decisions.**
>
> 我们不是帮助用户管理任务，而是帮助用户建立判断力（Judgment）。

今天几乎所有生产力软件都在管理：

* Todo
* Calendar
* Reminder
* Deadline

但是复杂工作真正失败的原因，通常不是忘记做，而是在关键节点做出了低质量决策。

JudgmentOS 希望成为一个 AI Decision Copilot。

它不会替用户做决定，而是帮助用户：

* 看清问题
* 减少不确定性
* 理解除不同选择的 Tradeoff
* 建立长期判断能力

---

# Product Philosophy

## Core Principle

> Every milestone exists to reduce uncertainty.

每一个 Milestone 的存在，都不是为了完成任务。

而是为了减少一个关键的不确定性。

如果一个 Milestone：

* 没有获得任何新的信息
* 没有验证任何假设
* 没有减少任何风险

那么它就是一个无效 Milestone。

---

## AI Philosophy

AI 不是：

"告诉用户答案。"

AI 是：

"帮助用户提出更好的问题，并帮助用户做出更好的判断。"

系统绝不能表现得像一个全知全能的专家。

它应该更像：

* 战略顾问
* Chief of Staff
* King's Advisor

---

# Target User

第一阶段：

高认知工作者：

* 创业者
* 产品经理
* 软件工程师
* AI Builder
* 独立开发者
* 咨询顾问
* 学生（复杂项目）

共同特点：

他们的问题不是不会执行。

而是在复杂项目中：

* 不知道什么时候应该停下来思考
* 不知道什么时候应该继续推进
* 害怕关键决策错误
* 容易在 Deadline 下跳过关键思考

---

# User Problem

用户不是拖延执行。

用户拖延的是：

Decision.

真正卡住的是：

"如果这里决定错了怎么办？"

因此：

AI 不应该管理 Todo。

AI 应该管理：

Decision。

---

# Core User Journey

Project

↓

AI 分析

↓

Milestones

↓

Decision Cards

↓

Reduce Uncertainty

↓

Decision

↓

Learning

↓

Judgment Database

---

# MVP Scope

仅做四个页面。

不要做 Calendar。

不要做 Team。

不要做 Chat。

不要做复杂 Project Management。

先做好 Decision。

---

# 1. Project Intake

用户输入：

"我要回中国创业"

"我要卖车"

"我要写一个 AI Agent"

AI 输出：

Project Summary

Project Goal

Suggested Milestones

Dependencies

Risks

Unknowns

用户可以：

* Edit
* Delete
* Add

任何修改都允许。

但是：

AI 必须展示：

Potential Tradeoffs。

例如：

删除一个 Milestone：

AI：

"If removed, you may lose..."

而不是：

"不能删除。"

---

# 2. Milestone

这是整个产品核心。

每一个 Milestone 包含：

## Goal

这个 Milestone 想解决什么？

不是：

完成什么。

而是：

减少哪个不确定性。

例如：

Market Validation

↓

Goal：

Determine whether customers are willing to pay.

---

## Decision

当前真正需要决定什么？

例如：

Sell Service

vs

Build SaaS

---

## Known Facts

系统首先搜索：

* Web
* 用户项目
* 历史记录

自动整理。

随后：

用户可以：

Challenge

Correct

Add Evidence

最终形成：

Verified Facts。

Truth 不属于 AI。

Truth 是共同构建出来的。

---

## Unknowns

AI 自动列出：

Still Unknown

例如：

* Pricing
* CAC
* PMF

---

## Assumptions

列出所有当前假设。

例如：

Customers care about...

---

## Risks

如果今天决定：

最坏后果是什么？

不是：

人生毁了。

而是：

真实成本。

例如：

Lost:

2 weeks.

Need to redo architecture.

---

## Next Experiment

不是：

Next Task。

而是：

Next Experiment。

例如：

Interview 5 customers.

Run landing page.

Build prototype.

---

# 3. Deadline

永远显示两条时间线。

User Timeline

AI Recommended Timeline

例如：

User：

3 Days

AI：

8 Days

系统自动展示：

Tradeoff

例如：

Compressed by:

62%

Pros

* Faster market feedback

Cons

* Less validation

* Higher decision risk

AI 永远不能替用户决定。

只能展示：

Tradeoff。

---

# 4. Milestone Completion

绝不能：

Done.

必须回答：

What did we learn?

例如：

We learned：

* Customers do care about privacy.

* Nobody wants feature X.

* Architecture assumption was wrong.

即使结果是否定。

也是 Learning。

---

# Decision Quality

每一个 Decision 都生成：

Decision Confidence

例如：

72%

Confidence Breakdown

Evidence

Assumptions

Guess

例如：

Evidence

68%

Assumption

24%

Guess

8%

如果 Guess 很高。

AI 建议：

增加一个验证 Milestone。

---

# Judgment Database

这是未来最重要资产。

所有 Decision 自动记录。

包括：

Decision

Why

Evidence

Unknowns

Confidence

Result

Reflection

未来可以搜索：

"为什么我当时这么决定？"

或者：

"我过去哪些判断最容易错？"

长期目标：

建立用户自己的 Judgment Model。

---

# AI Behaviors

AI 永远遵循：

Ask before Answer.

优先：

提出问题。

不是：

直接给建议。

---

AI 永远区分：

Fact

Inference

Assumption

Opinion

绝不能混在一起。

---

AI 每次建议：

必须说明：

Reasoning。

---

AI 可以说：

"I don't know."

如果信息不足。

必须建议：

How to reduce uncertainty.

而不是：

猜。

---

# Non Goals（MVP 不做）

不做：

* Calendar
* Team Collaboration
* Gantt Chart
* Reminder
* Habit Tracker
* Pomodoro
* Knowledge Base
* CRM
* Full Project Management

这些以后都可以接。

第一版只做：

Decision。

---

# UX Principles

Minimal.

Calm.

Slow Thinking.

不要：

大量按钮。

不要：

花哨动画。

页面应该像：

一本 King's Decision Journal。

让用户感觉：

自己正在召开一次战争会议。

而不是：

清 Todo。

---

# North Star Metric

不是：

Tasks Completed.

而是：

Decision Quality Improved.

短期代理指标：

* Decision Confidence 是否提升
* Unknowns 是否减少
* 每个 Milestone 是否获得新的信息
* 是否形成可复用的 Judgment Log

长期指标：

用户是否越来越少因为仓促决策而返工，是否越来越快地识别真正需要思考的关键节点，是否逐渐形成属于自己的判断框架。

---

# Product Motto

> Don't manage your tasks.
>
> Manage your judgment.

或者：

> Every great kingdom is built on great decisions.

以及产品首页的一句话：

> **A king is remembered not for every battle he fought, but for the decisions that changed the fate of the kingdom.**
