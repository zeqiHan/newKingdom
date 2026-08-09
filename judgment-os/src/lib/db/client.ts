import postgres from "postgres";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "./schema";

export type Db = PostgresJsDatabase<typeof schema>;

const globalForDb = globalThis as unknown as {
  judgmentSql?: ReturnType<typeof postgres>;
  judgmentDb?: Db;
};

function databaseUrl(): string {
  const url = process.env.DATABASE_URL?.trim();
  // Allow a dummy URL during `next build` (no real queries should run).
  if (!url || url.startsWith("file:")) {
    if (
      process.env.NEXT_PHASE === "phase-production-build" ||
      process.env.JUDGMENT_BUILD_PLACEHOLDER === "1"
    ) {
      return "postgresql://build:build@127.0.0.1:5432/build";
    }
    throw new Error(
      "未配置 DATABASE_URL。请在 .env.local 中填入 Supabase Postgres 连接串（Transaction / URI 模式）。见 SUPABASE.md。",
    );
  }
  return url;
}

function getSql() {
  if (!globalForDb.judgmentSql) {
    globalForDb.judgmentSql = postgres(databaseUrl(), {
      max: 5,
      prepare: false, // better with Supabase pooler (transaction mode)
    });
  }
  return globalForDb.judgmentSql;
}

export function getDb(): Db {
  if (!globalForDb.judgmentDb) {
    globalForDb.judgmentDb = drizzle(getSql(), { schema });
  }
  return globalForDb.judgmentDb;
}

/** Schema is applied via `npm run db:migrate` / Supabase SQL Editor — not on every request. */
export async function getReadyDb(): Promise<Db> {
  return getDb();
}
