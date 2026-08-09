# Supabase setup for JudgmentOS

## 1. Create a project

1. Open https://supabase.com/dashboard and create a Free project
2. Wait until the database is ready

## 2. Apply schema

1. Open **SQL Editor**
2. Paste the contents of `judgment-os/db/schema.sql`
3. Run it (once on an empty database)

Or from your machine:

```bash
cd judgment-os
# put DATABASE_URL in .env.local first
npx dotenv -e .env.local -- npm run db:migrate
```

(If you don't have dotenv-cli: `$env:DATABASE_URL="..."; npm run db:migrate` in PowerShell.)

## 3. Local app

```bash
cd judgment-os
cp .env.example .env.local
# edit DATABASE_URL + AI_BUILDER_TOKEN
npm run dev
```

## 4. Redeploy AI Builders with DATABASE_URL

Pass `DATABASE_URL` as a deploy `env_vars` value (connection string).  
`AI_BUILDER_TOKEN` is still injected by the platform — do not put it in env_vars.

After code is pushed, redeploy so the new Postgres client ships.

## Notes

- Free tier: ~500MB DB, may pause after ~7 days idle
- Redeploying the **app** no longer wipes project data (data lives in Supabase)
- Do not commit real connection strings
