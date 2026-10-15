# 06 — Conversation-First Principle (对话优先原则)

## Core Insight

**"如果使用过程像做作业一样，那么它就会没人使用。"**

This is not a feature request. This is a product survival principle.

---

## The Problem

### What We Built (MVP v0.1)

A powerful judgment framework with:
- Projects with goals, success criteria, constraints
- Uncertainties with importance and confidence
- Milestones with purpose and expected learning
- Evidence with type classification
- Decisions with tradeoffs and gate evaluation
- Sacrifice declarations with categories and impacts

**It's comprehensive. It's rigorous. It's unusable.**

### Why It's Unusable

Because using it feels like:

```
1. Fill in "Goal" textarea
2. Fill in "Success Criteria" textarea
3. Fill in "Constraints" textarea
4. Click "Generate Sacrifices"
5. Review 3 sacrifices, edit each one
6. Click "Accept"
7. Click "Add Uncertainty"
8. Fill in "Question" textarea
9. Adjust "Importance" slider
10. Adjust "Confidence" slider
11. Click "Submit"
12. Repeat for each uncertainty
13. ...

→ User gives up after step 3
```

**Homework. Not a tool. Nobody will use this.**

---

## The Solution

### Conversation-First Design

```
User types one message:

"我想两周内做出一个自己真正会用的判断力训练工具。
主要是帮我管理项目里的不确定性和决策。
约束是只有我一个人开发，技术栈用Next.js。
我可以牺牲完美主义和代码质量，但不能牺牲核心功能的完整性。"

↓

AI analyzes and fills:
✓ Goal: "Build a judgment training tool for personal use"
✓ Success Criteria: "Manage uncertainties and decisions in real projects"
✓ Constraints: "Solo developer, Next.js stack, 2 weeks"
✓ Willing Sacrifices:
  - TIME: Compressed 2-week timeline
  - QUALITY: Accept less polished code
  - SCOPE: Core features only
✓ Key Uncertainties:
  - Will I actually use this daily?
  - Can decision structure improve judgment?
  - Is 2 weeks realistic?
✓ Suggested Milestones:
  - M1: Build core project/uncertainty structure (3 days)
  - M2: Implement decision engine (5 days)
  - M3: Use on real project for 7 days (7 days)

↓

User sees:
[Clean summary card]

All framework fields are filled in the background.
User can click "View Details" to see/edit.
But they don't have to.
```

---

## Design Principles

### 1. Input: Natural Language

**Not:**
- "Enter your goal in the goal field"
- "Rate importance from 0-100"
- "Select sacrifice category"

**Instead:**
- "Tell me about your project"
- AI extracts structure
- User refines if needed

### 2. Output: Progressive Disclosure

**Default view (Collapsed):**
```
📋 Project: Build JudgmentOS MVP

Goal: Judgment training tool for personal use
Timeline: 2 weeks
Status: Active

[Start Working] [View Full Details ▼]
```

**Expanded view (Optional):**
```
📋 Project: Build JudgmentOS MVP

━━━ Summary ━━━
Goal: Build a judgment training tool...
Success Criteria: Manage uncertainties...
Constraints: Solo developer, Next.js...

━━━ Willing Sacrifices (3) ━━━
⏱️ TIME: Compressed 2-week timeline
⚠️ QUALITY: Accept less polished code
🎯 SCOPE: Core features only
[Edit]

━━━ Key Uncertainties (3) ━━━
1. ██████████ Will I actually use this daily?
2. ████████ Can decision structure improve judgment?
3. ██████ Is 2 weeks realistic?
[Add More]

━━━ Milestones (3) ━━━
...
```

### 3. Editing: In-Context

**Not:**
- Open modal
- Fill form
- Submit
- Close modal

**Instead:**
- Click inline
- Edit directly
- Save automatically
- Continue flow

### 4. Framework: Background

The rich structure (uncertainties, evidence types, decision gates, belief updates) exists in the database and powers the AI.

But **users never see it unless they want to.**

Think of it like:
- **Git internals** → powerful, but hidden
- **Git commands** → simple interface
- **Git GUIs** → even simpler

JudgmentOS structure is the internals.
Conversation is the interface.

---

## Implementation Strategy

### Phase 1: Conversation Input (Current Sprint)

Replace forms with conversational input:

**Before:**
```tsx
<form>
  <textarea name="goal" placeholder="Enter goal..." />
  <textarea name="success_criteria" placeholder="Enter criteria..." />
  <textarea name="constraints" placeholder="Enter constraints..." />
  <button>Create Project</button>
</form>
```

**After:**
```tsx
<ConversationInput
  placeholder="Tell me about your project..."
  onSubmit={async (message) => {
    const analysis = await analyzeProjectInput(message);
    // Auto-fills: goal, criteria, constraints, sacrifices, uncertainties
    createProjectWithAnalysis(analysis);
  }}
/>

<details>
  <summary>View Full Framework Details</summary>
  {/* All the structured fields, editable */}
</details>
```

### Phase 2: Continuous Conversation

Don't just use it at project creation.

Use it throughout:

```
User: "我觉得这个milestone可能需要延后，因为发现了新的技术难题"

AI analyzes:
→ Updates milestone deadline
→ Adds new uncertainty: "Technical challenge X"
→ Suggests re-evaluating related decisions
→ Asks: "Do you need to adjust sacrifices?"

User sees:
"✓ Updated Milestone 2 deadline to +3 days
 + Added uncertainty: Technical challenge X
 
 This may affect your timeline sacrifice. 
 [Review Sacrifices]"
```

### Phase 3: Smart Defaults + Refinement

AI proposes.
User refines (if needed).
Not user fills → AI validates.

**Current (Wrong):**
```
User fills everything → AI checks → AI suggests improvements
```

**Future (Right):**
```
User describes → AI fills everything → User refines (optional)
```

---

## UI Patterns

### Pattern 1: Conversation → Cards

```
[Conversation Input Box]
─────────────────────
↓ Submit
─────────────────────

[Generated Cards]

┌─────────────────────┐
│ 📋 Project Summary  │
│ Goal: ...           │
│ Timeline: ...       │
└─────────────────────┘

┌─────────────────────┐
│ ⚠️ Sacrifices (3)   │
│ • TIME: ...         │
│ • QUALITY: ...      │
│ [View All ▼]        │
└─────────────────────┘

┌─────────────────────┐
│ ❓ Uncertainties (3)│
│ 1. Will I use this? │
│ 2. Is 2 weeks ok?   │
│ [View All ▼]        │
└─────────────────────┘
```

### Pattern 2: Inline Editing

```
┌─────────────────────────────────┐
│ Goal: Build judgment training   │  [Edit]
│       tool for personal use     │
└─────────────────────────────────┘
               ↓ Click Edit
┌─────────────────────────────────┐
│ [Input box with current text]   │
│                                 │  [Save] [Cancel]
└─────────────────────────────────┘
               ↓ Save
┌─────────────────────────────────┐
│ Goal: Build judgment tool that  │  [Edit]
│       I'll actually use daily   │
└─────────────────────────────────┘
```

### Pattern 3: Progressive Disclosure

```
Default (Minimal):
━━━━━━━━━━━━━━━━
Project: JudgmentOS MVP
Status: Active
[Continue Working]
━━━━━━━━━━━━━━━━

↓ Click anywhere

Expanded (Detailed):
━━━━━━━━━━━━━━━━━━━━━━━━━━━
Project: JudgmentOS MVP

📋 Summary
   Goal: ...
   Timeline: ...
   
⚠️ Sacrifices (3)
   • TIME: Compressed timeline
   • QUALITY: Less polished
   • SCOPE: Core only
   [Edit]
   
❓ Uncertainties (3)
   1. ██████████ Daily usage?
   2. ████████ Judgment improvement?
   3. ██████ Timeline realistic?
   [Manage]
   
🎯 Milestones (3)
   → M1: Core structure (Done)
   → M2: Decision engine (In Progress)
   → M3: Real project test (Planned)
   [View Details]
━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## Migration Path

### Don't Break Existing Data

Users who filled forms manually → keep their data.

Just add conversational interface on top:

```tsx
{/* New: Conversation input */}
<ConversationInput />

{/* Old: Form fallback */}
<details>
  <summary>Or use manual form</summary>
  <ManualForm />
</details>
```

### Gradual Rollout

1. **Sprint 1**: Add conversation input to project creation
2. **Sprint 2**: Add conversation to milestone/uncertainty updates
3. **Sprint 3**: Add conversation to decision points
4. **Sprint 4**: Full conversation-driven workflow

---

## Success Metrics

### We'll know it works when:

1. **Time to create project drops**
   - From: 5-10 minutes filling forms
   - To: 30 seconds describing project

2. **Users actually complete setup**
   - From: 30% abandon mid-form
   - To: 90% complete via conversation

3. **Users engage with framework**
   - From: "This is too complex"
   - To: "Oh, I can just click to see details"

4. **Daily usage increases**
   - From: Create once, never return
   - To: Daily conversation updates

5. **Users customize AI output**
   - Not blindly accepting
   - Actually refining and editing
   - Shows engagement

---

## Philosophy Alignment

### Still Building Judgment

The framework is still there:
- Uncertainties
- Evidence classification
- Decision gates
- Sacrifice declarations
- Belief updates

**We're not dumbing it down.**

**We're making it accessible.**

### AI as Interface Layer

```
User's mental model → Natural language
         ↓
    AI translation
         ↓
Structured framework → Database
         ↓
    AI translation
         ↓
User-friendly output → Natural language
```

AI is the **translation layer** between:
- How humans think (messy, narrative)
- How systems work (structured, rigorous)

### Human Agency Preserved

Conversation doesn't mean:
- AI decides for you
- AI hides tradeoffs
- AI removes control

Conversation means:
- AI handles tedious structure
- User focuses on judgment
- Structure emerges from use

---

## Anti-Patterns to Avoid

### ❌ Chatbot Hell

**Bad:**
```
AI: "What's your project goal?"
User: "Build a tool"
AI: "What are your success criteria?"
User: "Make it useful"
AI: "What are your constraints?"
User: (annoyed) "Just let me type!"
```

**Good:**
```
User: "I want to build a useful tool"
AI: [Analyzes entire message]
User: [Reviews generated structure]
```

### ❌ Hidden Complexity

**Bad:**
```
AI fills everything.
User never sees framework.
User doesn't understand decisions.
```

**Good:**
```
AI fills everything.
User can always view/edit structure.
Progressive disclosure teaches framework.
```

### ❌ Loss of Rigor

**Bad:**
```
"Just chat with AI"
→ No structure
→ No accountability
→ No judgment building
```

**Good:**
```
"Chat to fill structure"
→ Structure exists
→ Accountability preserved
→ Judgment still built
```

---

## Implementation Priority

### Must Have (Sprint 1)
- [ ] Conversation input for project creation
- [ ] AI auto-fills goal/criteria/constraints/sacrifices
- [ ] Collapsible detail view
- [ ] Inline editing for all fields

### Should Have (Sprint 2)
- [ ] Conversation for milestone updates
- [ ] Conversation for uncertainty management
- [ ] Smart suggestions during conversation
- [ ] Natural language → structured data parser

### Nice to Have (Sprint 3)
- [ ] Multi-turn conversation
- [ ] Context-aware responses
- [ ] Voice input option
- [ ] Keyboard shortcuts for power users

---

## Related Documents

- [00 — Vision](00-vision.md)
- [01 — Judgment Theory](01-judgment-theory.md)
- [02 — Product Philosophy](02-product-philosophy.md)
- [04 — System Design](04-system-design.md)

---

## Closing

> "The best interface is no interface."
> 
> But when you need one, make it **conversational**.

We're building judgment, not forms.

The framework is the foundation.

The conversation is the interface.

Users shouldn't feel like they're filling homework.

They should feel like they're **thinking out loud with a smart advisor.**
