# JudgmentOS

Build Judgment. Not Just Decisions.

## What works now

- **Supabase Postgres** for durable data
- AI goal proposal + evidence belief updates
- Screens: `/projects`, `/projects/:id`, `/milestones/:id`

## Setup

1. Create a Supabase project and apply `db/schema.sql` (see [../SUPABASE.md](../SUPABASE.md))
2. Local:

```bash
npm install
cp .env.example .env.local
# set DATABASE_URL + AI_BUILDER_TOKEN
npm run db:migrate   # or paste schema.sql in Supabase SQL Editor
npm run dev
```

Open http://localhost:3000/projects

## Deploy

See [../DEPLOY.md](../DEPLOY.md) and [../SUPABASE.md](../SUPABASE.md).
