# JudgmentOS on AI Builders / Koyeb
# Requires DATABASE_URL (Supabase Postgres) at runtime.

FROM node:20-alpine AS deps
WORKDIR /app
COPY judgment-os/package.json judgment-os/package-lock.json ./
RUN npm ci

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY judgment-os/ ./
ENV NEXT_TELEMETRY_DISABLED=1
# Build-time placeholder so Next can compile; runtime uses real DATABASE_URL
ENV DATABASE_URL=postgresql://build:build@127.0.0.1:5432/build
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0
ENV LLM_PROVIDER=openai-compatible
ENV LLM_BASE_URL=https://space.ai-builders.com/backend/v1
ENV LLM_MODEL=grok-4-fast
# AI_BUILDER_TOKEN injected by platform.
# DATABASE_URL must be provided at deploy time (Supabase connection string).

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 8000

# Koyeb sets PORT; Next standalone reads it. Default 8000 for local docker runs.
CMD sh -c "node server.js"
