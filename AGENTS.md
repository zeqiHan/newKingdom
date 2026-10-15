# JudgmentOS — agent notes

App lives in `judgment-os/` (Next.js 16). Product docs are under `docs/`. See `judgment-os/README.md` and `SUPABASE.md` for standard setup.

## Cursor Cloud specific instructions

### Services

| Service | Required? | How to run |
| --- | --- | --- |
| PostgreSQL 16 (local) | **Yes** | `sudo pg_ctlcluster 16 main start` then confirm with `pg_isready` |
| Next.js app | **Yes** | `cd judgment-os && npm run dev` → http://localhost:3000 |
| LLM / web search | Optional | Needs `AI_BUILDER_TOKEN` or `LLM_API_KEY` in `judgment-os/.env.local`; manual project create works without them |

### Local database (this environment)

- Cluster: PostgreSQL 16 on `127.0.0.1:5432`
- Role/DB: `judgment` / `judgmentos` (password `judgment`)
- `DATABASE_URL` for local: `postgresql://judgment:judgment@127.0.0.1:5432/judgmentos`
- Create `judgment-os/.env.local` from `.env.example` with that `DATABASE_URL` if missing (gitignored)
- First-time / empty DB: from `judgment-os/`, with env loaded:
  - `npm run db:migrate` (applies `db/schema.sql`)
  - then `npm run db:migrate -- db/migrations/002_decision_gate.sql`, `003_v02_action_feedback.sql`, `004_plan_proposals.sql`
- Do **not** point local agents at the public deploy (`https://judgment-os.ai-builders.space/`) unless explicitly asked

### Commands (from `judgment-os/`)

- Lint: `npm run lint`
- Dev: `npm run dev`
- Migrate: `npm run db:migrate` (see above)
- No automated test suite in `package.json` yet
- Health check: `GET /api/health`

### Gotchas

- Next.js 16 has breaking changes — read `judgment-os/AGENTS.md` and `node_modules/next/dist/docs/` before changing app code
- `schema.sql` alone is not enough for v0.2; always apply migrations `002`–`004` as well (or `plan_proposals` and related columns will be missing)
- Postgres does not always auto-start on new agent pods; start the cluster before `npm run dev` if `/projects` errors on DB connect
- AI slices (goal proposal, belief update, decision gate, research) fail closed without a valid LLM token; use **手动创建（不用 AI）** for DB-only smoke tests
