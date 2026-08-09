# Deploy (AI Builders)

Public URL: https://judgment-os.ai-builders.space/

## Database

JudgmentOS uses **Supabase Postgres** (`DATABASE_URL`).  
See [SUPABASE.md](SUPABASE.md). Redeploying the app **does not** wipe project data.

## Deploy parameters

| Field | Value |
| --- | --- |
| `repo_url` | `https://github.com/zeqiHan/newKingdom` |
| `branch` | `master` |
| `service_name` | `judgment-os` |
| `env_vars` | `DATABASE_URL` = Supabase URI (required). Optional: `LLM_MODEL`, etc. |

Do **not** put `AI_BUILDER_TOKEN` in `env_vars` — the platform injects it.

## After schema + code push

1. Apply `judgment-os/db/schema.sql` in Supabase SQL Editor (first time)
2. Commit + push
3. Redeploy with `DATABASE_URL` set
4. Open https://judgment-os.ai-builders.space/projects
