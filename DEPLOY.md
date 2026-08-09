# Deploy (AI Builders)

JudgmentOS can be deployed to `ai-builders.space` from this public repo.

## Requirements met

- Root `Dockerfile` (builds `judgment-os/`)
- Listens on `PORT` via Next.js standalone (`HOSTNAME=0.0.0.0`)
- Single process
- Uses injected `AI_BUILDER_TOKEN` for LLM calls (no secret in `env_vars`)
- Health check: `GET /api/health`

## Limits to know

- **256 MB RAM** nano instance — keep the app lean; cold starts may be slow
- **SQLite is ephemeral** — data lives in the container and **resets on redeploy**
- Repo must stay **public** for AI Builders deploy
- First deploy locks `repo_url` to this GitHub repo for that `service_name`

## Deploy parameters

| Field | Value |
| --- | --- |
| `repo_url` | `https://github.com/zeqiHan/newKingdom` |
| `branch` | `master` |
| `service_name` | e.g. `judgment-os` → `https://judgment-os.ai-builders.space` |
| `env_vars` | optional non-secrets only, e.g. `LLM_MODEL=grok-4-fast` |

Do **not** put `AI_BUILDER_TOKEN` in `env_vars` — the platform injects it.

## After push

1. Commit + push Dockerfile and app changes
2. Call deploy API / ask Cursor to deploy
3. Wait 5–10 minutes; check logs if needed
4. Open `https://{service_name}.ai-builders.space/projects`
