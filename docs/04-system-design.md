# 04 — System Design v0.1

从「这个产品应该怎样思考」进入：

> **什么软件结构能够承载这种思考？**

仍然不写代码。

这份文档的目标：Cursor 看完就知道第一版怎么搭。

---

## MVP Boundary

第一版只跑通一条完整闭环：

```text
Create Project
      ↓
Clarify Goal
      ↓
Generate Uncertainties
      ↓
Generate / Edit Milestones
      ↓
Research Evidence
      ↓
Decision
      ↓
Action / Experiment
      ↓
Capture Feedback
      ↓
Update Project
```

**只要这一圈能真的跑起来，MVP 就成立。**

先不实现长期 Judgment Model。

没有真实数据时设计它，容易变成空想。

第一版只要把历史完整保存下来，为以后学习留接口。

---

## 1. Architecture

MVP 保持简单：

```text
Browser
   │
   ▼
Next.js
   │
   ├── UI
   │
   ├── Server/API
   │
   ▼
Decision Engine
   │
   ├── LLM
   ├── Web Research
   └── State Transition
   │
   ▼
PostgreSQL
```

### Suggested stack

- Next.js + TypeScript
- PostgreSQL / Supabase
- One LLM Provider
- One Search Provider

### Non-negotiable

> **Model and search providers must be replaceable.**

JudgmentOS 不与任何一家模型绑死。

---

## 2. Data Model

今天最重要的不是技术，而是数据。

MVP 六个核心实体：

```text
Project
│
├── Uncertainty
│
├── Milestone
│     └── Evidence
│
├── Decision
│
└── Feedback
```

### Project

```text
id
title
goal
success_criteria
constraints
user_deadline
recommended_deadline
status
created_at
```

### Uncertainty

```text
id
project_id
question
importance
current_confidence
status
```

关键字段是 `question`。

例如：

> 企业客户是否真的愿意为这个产品付钱？

### Milestone

```text
id
project_id
uncertainty_id
title
purpose
expected_learning
status
deadline
```

必须保留 **`expected_learning`**。

它强迫系统回答：

> 为什么这个 Milestone 值得存在？

### Evidence

```text
id
milestone_id
claim
type
source
confidence
user_status
```

`type`：

```text
FACT
ASSUMPTION
INFERENCE
OPINION
```

`user_status`：

```text
UNREVIEWED
ACCEPTED
CHALLENGED
CORRECTED
```

直接支持：

> System Research → User Challenge → Updated Reality

### Decision

```text
id
project_id
milestone_id
question
options
selected_option
reasoning
confidence
status
```

`status`：

```text
OPEN
PROVISIONAL
FROZEN
REOPENED
```

### Feedback

```text
id
milestone_id
decision_id
expected_outcome
actual_outcome
learning
confidence_before
confidence_after
created_at
```

它让：

> Decision → Reality

第一次真正闭环。

---

## 3. Milestone State Machine

不要只有 `TODO` / `DONE`。

```text
PROPOSED
   ↓
RESEARCHING
   ↓
READY_TO_DECIDE
   ↓
DECIDED
   ↓
ACTION_RUNNING
   ↓
FEEDBACK_REQUIRED
   ↓
LEARNING_CAPTURED
```

以及：

```text
ARCHIVED
```

**没有 `DONE`。**

这是刻意的产品设计。

Milestone 的终点不是完成。

而是：

> **Learning Captured**

---

## 4. Human Override

用户拥有：

```text
Create
Edit
Delete
Reorder
Reopen
Override
```

AI 不能禁止。

如果修改可能产生明显影响：

```text
User Action
      ↓
Impact Analysis
      ↓
Show Tradeoffs
      ↓
User Confirms
      ↓
State Changes
```

例如用户删除 **Customer Validation**：

系统不能说：

> ❌ 不允许。

应该说：

> 删除后预计节省 3–5 天。
>
> 但「客户是否愿意付费」将保持 unresolved，并可能增加后续产品方向错误的风险。

然后：

```text
[Keep Milestone]
[Delete Anyway]
```

这就是：

**Human Agency + Visible Consequences.**

---

## 5. Research Layer

第一版不要搞复杂 Agent。

简单流程：

```text
Milestone
   ↓
Identify research questions
   ↓
Search
   ↓
Extract claims
   ↓
Attach sources
   ↓
Classify
   ↓
Evidence
```

原则：

> **Source ≠ Fact.**

搜索到某网页写了一句话，不意味着它自动成为事实。

系统保存：

```text
Claim
Source
Evidence Type
Confidence
```

用户再 Challenge。

---

## 6. Decision Engine ≠ UI Prompt

Architecture 应该是：

```text
UI
  ↓
Decision Engine
  ↓
LLM
```

而不是：

```text
UI → Prompt GPT
```

以后换 GPT → Claude → Gemini → GPT-X，Decision Engine 不应改变。

> **Model provides intelligence.**
>
> **Decision Engine provides structure.**

这是「汽车 vs 马」第一次真正进入软件架构。

---

## 7. Deadline Engine

第一版保持简单。

保存：

```text
user_deadline
recommended_deadline
```

系统生成：

```text
TIME SAVED
BENEFITS
RISKS
MILESTONES COMPRESSED
EXPECTED INFORMATION LOSS
```

最后一个最重要：

> **Expected Information Loss**

比普通项目管理里的「Deadline Risk」更符合 JudgmentOS。

我们关心的不是：

> 能不能按时做完？

而是：

> **为了赶这个时间，我们放弃了哪些原本应该获得的信息？**

---

## 8. MVP UI — Three Screens Only

### `/projects`

看到所有 Project。

### `/projects/:id`

主界面：

```text
PROJECT GOAL

Deadline
User        AI Recommended
Aug 20      Aug 26


KEY UNCERTAINTIES

1. ████████ Customer willingness to pay
2. █████ Technical feasibility


MILESTONES

① Customer interviews
   ↓
   Learning expected:
   Will customers pay?


② Prototype
   ↓
   Learning expected:
   Can the workflow actually work?
```

点击 Milestone → 进入 workspace。

### `/milestones/:id`

Decision Workspace：

```text
UNCERTAINTY

What are we trying to learn?


KNOWN EVIDENCE

FACT
...

ASSUMPTION
...


UNKNOWN

...


DECISION

Option A
Option B


TRADEOFFS


NEXT EXPERIMENT
```

这就是第一版。

不要做四五十个页面。

---

## 9. Engineering Principle

> **The system must preserve reasoning, not just state.**

普通软件只保存：

```text
selected_option = A
```

JudgmentOS 必须保存：

```text
selected_option = A
because = ...
evidence_at_time = ...
unknowns_at_time = ...
confidence_at_time = ...
deadline_at_time = ...
```

半年以后：

> 「当时为什么这么决定？」

可能比：

> 「当时决定了什么？」

重要十倍。

这也是未来 Judgment Database 真正的数据基础。

---

## Definition of Done (v0.1)

这份 System Design 不需要 30 页。

四件事锁死即可：

1. **Architecture**
2. **Data Model**
3. **State Machine**
4. **MVP Screens**

第一版实现目标只有一句：

> 让一条完整的 Judgment 闭环，在软件里跑通。
