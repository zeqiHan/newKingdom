# JudgmentOS on AI Builders / Koyeb
# Repo root Dockerfile (required by AI Builders). Builds judgment-os/ Next.js app.

FROM node:20-alpine AS deps
WORKDIR /app
COPY judgment-os/package.json judgment-os/package-lock.json ./
RUN npm ci

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY judgment-os/ ./
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0
# Ephemeral local DB for MVP demo (data resets on redeploy / new instance)
ENV DATABASE_URL=file:/app/data/judgment.db
ENV LLM_PROVIDER=openai-compatible
ENV LLM_BASE_URL=https://space.ai-builders.com/backend/v1
ENV LLM_MODEL=grok-4-fast
# AI_BUILDER_TOKEN is injected by the platform at runtime — do not bake secrets in.

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs \
  && mkdir -p /app/data \
  && chown nextjs:nodejs /app/data

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

# Platform sets PORT (default 8000 on AI Builders / Koyeb)
EXPOSE 8000

# Must use shell form so ${PORT} expands
CMD sh -c "node server.js"
