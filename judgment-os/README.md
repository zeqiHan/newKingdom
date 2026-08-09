# JudgmentOS

Build Judgment. Not Just Decisions.

## What works now

- Local DB (libsql) + Project / Uncertainty / Milestone / Evidence chassis
- **AI vertical slice:** raw goal → Decision Engine proposal → human edit/confirm → persist
- Screens: `/projects`, `/projects/:id`, `/milestones/:id`

## Architecture

```
UI → Decision Engine → LLM Provider (replaceable) → Model
UI → DB queries → libsql / later Postgres
```

Never call the LLM from UI components. Provider is configured via env.

## Setup

```bash
npm install
cp .env.example .env.local
# set AI_BUILDER_TOKEN or LLM_API_KEY
npm run db:seed   # optional demo data
npm run dev
```

Open http://localhost:3000/projects — use **Create Project with AI**.
