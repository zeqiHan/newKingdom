# 05 — Sacrifice Declaration (牺牲声明)

## Core Principle

**你必须牺牲什么，才能得到什么？**

(You must sacrifice something to gain something.)

---

## Why Sacrifice Declaration?

### The Problem

Most productivity tools hide the real cost of decisions:

- "Just add this feature" → ignores time/quality tradeoff
- "Meet this deadline" → ignores risk/scope sacrifice
- "Use these resources" → ignores opportunity cost

Users make choices without seeing what they're giving up.

### JudgmentOS Solution

**Make the cost visible. Force explicit tradeoffs.**

Every goal requires sacrifice. Every action has a cost.

We don't let you proceed until you acknowledge what you're willing to sacrifice.

---

## Two Levels

### 1. Project-level Sacrifices

**When:** At project creation  
**Question:** What are you willing to sacrifice to achieve this goal?

These are high-level tradeoffs you accept from the start:

- "I will sacrifice code quality for speed"
- "I will sacrifice feature scope for earlier validation"
- "I will sacrifice budget for better talent"

**Purpose:** Set explicit boundaries for the entire project.

### 2. Action-level Sacrifices

**When:** Before starting each action/experiment  
**Question:** What will THIS specific action require you to sacrifice?

These are immediate, concrete costs:

- "This action will consume 2 weeks that could go to feature X"
- "This research will delay customer validation by 10 days"
- "This technical choice will increase maintenance cost"

**Purpose:** Make the opportunity cost of each action visible.

---

## How It Works

### Step 1: AI Proposes 3 Options

AI analyzes your:
- Goal
- Success criteria
- Constraints
- Deadline
- (For actions: project context + action details)

Then generates **3 realistic sacrifice options**, each with:

1. **Category**: TIME / QUALITY / SCOPE / RESOURCE / RISK / OTHER
2. **Description**: What will be sacrificed (specific and clear)
3. **Impact**: The real consequence (concrete effects)

### Step 2: You Review & Modify

You can:
- ✓ Accept as-is
- ✏️ Edit any field (marks as "Modified")
- ➕ Add custom sacrifices
- 🔄 Change category

### Step 3: You Accept

Once you click "Accept These Sacrifices":
- Sacrifices become read-only
- Timestamp recorded
- Judgment event logged

Now you've made the tradeoff explicit and taken ownership of the cost.

---

## Categories Explained

### ⏱️ TIME
Sacrificing schedule, deadline flexibility, or time for other work.

**Example:**  
"Compress the timeline from 4 weeks to 2 weeks"  
**Impact:** Higher stress, less time for iteration, rushed decisions.

### ⚠️ QUALITY
Sacrificing code quality, design polish, or thoroughness.

**Example:**  
"Skip comprehensive testing to ship faster"  
**Impact:** Technical debt, potential bugs in production, harder maintenance.

### 🎯 SCOPE
Sacrificing features, breadth, or completeness.

**Example:**  
"Drop the admin dashboard to focus on core user flow"  
**Impact:** Manual admin work, delayed internal tooling, workaround needed.

### 💰 RESOURCE
Sacrificing budget, team size, or tools.

**Example:**  
"Use free tools instead of paid SaaS"  
**Impact:** More manual work, slower iteration, limited features.

### 🎲 RISK
Sacrificing safety, certainty, or risk mitigation.

**Example:**  
"Launch without customer validation"  
**Impact:** High chance of building wrong thing, wasted effort, potential pivot.

### 📋 OTHER
Any other meaningful tradeoff.

---

## Design Principles

### 1. AI Advises, User Decides

AI generates proposals. **You** own the final decision.

Never:
- AI silently choosing for you
- Hidden tradeoffs
- Sugarcoated consequences

Always:
- Explicit options
- Real impacts
- User control

### 2. Realistic, Not Catastrophic

AI proposals should be:
- ✓ Concrete and measurable
- ✓ Realistic consequences
- ✓ Varied in nature

Not:
- ✗ All doom and gloom
- ✗ All trivial
- ✗ Vague or abstract

### 3. Make It Hurt (A Little)

The point is to feel the cost.

If sacrifice acceptance is too easy, we've failed.

Users should pause and think:
> "Am I really willing to give this up?"

### 4. No Proceeding Without Acknowledgment

(Future feature)

Eventually, you cannot:
- Start an action without accepting its sacrifices
- Change deadline without acknowledging new tradeoffs
- Add scope without declaring what you'll sacrifice

---

## Integration Points

### Current: Project Detail Page

1. Create a project (AI or manual)
2. See "牺牲声明 (Sacrifice Declaration)" section
3. Click "生成 AI 牺牲提案"
4. Review, modify, accept

### Future: Action Creation

When creating an experiment/action:

1. Fill in action details
2. AI automatically generates action-level sacrifices
3. Must accept before action can start

### Future: Decision Gate

At decision points, show:
- Project-level sacrifices
- Action-level sacrifices
- New sacrifices this decision would introduce

### Future: Feedback Loop

After action completion:
- "Were the sacrifices accurate?"
- "What did you actually lose?"
- Learn from prediction vs reality

---

## UI/UX Details

### Visual Design

Each sacrifice shows:
- Category badge with color (orange for TIME, red for QUALITY, etc.)
- Category icon (⏱️ ⚠️ 🎯 💰 🎲 📋)
- "AI-suggested" or "Modified" label
- Description
- Impact
- Accepted timestamp (after acceptance)

### States

1. **Empty**: "生成 AI 牺牲提案" button
2. **Generated**: 3 proposals, editable
3. **Accepted**: Read-only, green confirmation

### Interaction

- Click "Edit" on any sacrifice → inline form
- Click "Save" → marks as user-modified
- Click "+ Add Custom" → custom form
- Click "Accept These Sacrifices" → locks in

---

## Philosophy Check

### Model Scaling Test

> If AI becomes 100x more powerful, does this feature still matter?

**YES.**

Because:
- AI cannot decide values for you
- Tradeoffs are about what YOU care about
- Responsibility for consequences belongs to humans
- This is a judgment structure, not a generation capability

### Core Product Rules

From `02-product-philosophy.md`:

**Decision Rule:**
> AI 可以推荐。  
> AI 不能偷偷替用户做价值取舍。
> 
> 每一次推荐，必须展示：
> - Alternatives
> - **Tradeoffs**
> - Unknowns

Sacrifice Declaration is the concrete implementation of **Tradeoffs**.

---

## Open Questions

These are not urgent. We'll answer them as we learn.

1. **When should users be allowed to change accepted sacrifices?**
   - Should they be immutable?
   - Or changeable with an audit trail?

2. **How do we handle conflicting sacrifices?**
   - "Sacrifice quality" at project level
   - "Maintain high quality" in an action
   - Should we warn? Force resolution?

3. **What if users consistently underestimate sacrifices?**
   - Build a judgment database
   - Show historical accuracy
   - Adjust confidence over time

4. **Should we block actions without sacrifice acceptance?**
   - Too strict? Too soft?
   - Start soft, tighten later?

5. **Can we quantify sacrifice magnitude?**
   - Severity score?
   - Reversibility measure?
   - Recovery cost estimate?

---

## Success Metrics

We'll know Sacrifice Declaration works when:

1. **Users pause before accepting**
   - Not instant click-through
   - Shows they're thinking

2. **Users modify AI proposals**
   - They engage with tradeoffs
   - They customize to their context

3. **Users add custom sacrifices**
   - They internalize the framework
   - They see tradeoffs AI missed

4. **Users reference sacrifices in decisions**
   - "Remember we said we'd sacrifice quality"
   - Shows ownership

5. **Sacrifice accuracy improves over time**
   - Better predictions
   - Better self-awareness

---

## Related Documents

- [00 — Vision](00-vision.md)
- [01 — Judgment Theory](01-judgment-theory.md)
- [02 — Product Philosophy](02-product-philosophy.md)
- [03 — Decision Engine](03-decision-engine.md)

---

## Closing Quote

> 如果明天所有 AI 模型能力提升 100 倍，这份文档还有价值吗？
> 
> 如果答案是 **有** —— 那我们就在打造真正的护城河。

Sacrifice Declaration will remain valuable because **AI may evolve from a horse to a car, but the system that determines what to sacrifice and who bears the cost will always be human.**
