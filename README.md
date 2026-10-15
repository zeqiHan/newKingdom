# JudgmentOS

Build Judgment. Not Just Decisions.

## Core Principles

**一句话：执行不值钱，判断才值钱。**

1. **Conversation-First** - 如果使用过程像做作业一样，那么它就会没人使用
2. **Sacrifice Declaration** - 你必须牺牲什么，才能得到什么
3. **Human Agency** - AI 是顾问，不是决策者

## What's New (v0.2)

### 💬 Conversation-First Interface

**Before:** Fill 10+ form fields (homework-style)  
**Now:** Type one message, AI fills everything

```
User: "我想两周内做出一个判断力训练工具..."
  ↓
AI: Auto-fills goal, criteria, constraints, sacrifices, uncertainties, milestones
  ↓
User: Review summary → Create project (30 seconds)
```

### ⚖️ Sacrifice Declaration

Make tradeoffs explicit. Every goal requires sacrifice.

- AI proposes 3 realistic sacrifices
- Categories: TIME, QUALITY, SCOPE, RESOURCE, RISK
- User accepts/modifies/adds custom
- No hidden costs

## Structure

```
judgment-os/   # Next.js app (conversation + AI framework)
docs/          # product documents
Dockerfile     # AI Builders deploy (see DEPLOY.md)
```

## Docs

### Core Philosophy
- [00 — Vision](docs/00-vision.md)
- [01 — Judgment Theory](docs/01-judgment-theory.md)
- [02 — Product Philosophy](docs/02-product-philosophy.md)

### System & Engine
- [03 — Decision Engine](docs/03-decision-engine.md)
- [04 — System Design](docs/04-system-design.md)

### Features
- [05 — Sacrifice Declaration](docs/05-sacrifice-declaration.md)
- [06 — Conversation-First Principle](docs/06-conversation-first-principle.md)

### Deployment
- [Deploy](DEPLOY.md)
- [Supabase](SUPABASE.md)
