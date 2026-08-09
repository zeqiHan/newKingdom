import fs from "fs";
import path from "path";
import { createClient, type Client } from "@libsql/client";
import { drizzle, type LibSQLDatabase } from "drizzle-orm/libsql";
import * as schema from "./schema";

export type Db = LibSQLDatabase<typeof schema>;

const globalForDb = globalThis as unknown as {
  judgmentClient?: Client;
  judgmentDb?: Db;
  judgmentMigrated?: boolean;
};

function databaseUrl(): string {
  return (
    process.env.DATABASE_URL ??
    `file:${path.join(process.cwd(), "data", "judgment.db")}`
  );
}

function ensureDataDir(url: string) {
  if (!url.startsWith("file:")) return;
  const filePath = url.replace(/^file:/, "");
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function getClient(): Client {
  if (!globalForDb.judgmentClient) {
    const url = databaseUrl();
    ensureDataDir(url);
    globalForDb.judgmentClient = createClient({ url });
  }
  return globalForDb.judgmentClient;
}

export function getDb(): Db {
  if (!globalForDb.judgmentDb) {
    globalForDb.judgmentDb = drizzle(getClient(), { schema });
  }
  return globalForDb.judgmentDb;
}

/** Idempotent local schema apply for the SQLite chassis. */
export async function ensureSchema(): Promise<void> {
  const client = getClient();
  await client.executeMultiple(`
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      goal TEXT NOT NULL DEFAULT '',
      success_criteria TEXT NOT NULL DEFAULT '',
      constraints TEXT NOT NULL DEFAULT '',
      user_deadline TEXT,
      recommended_deadline TEXT,
      status TEXT NOT NULL DEFAULT 'ACTIVE',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS uncertainties (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      question TEXT NOT NULL,
      importance INTEGER NOT NULL DEFAULT 0,
      current_confidence INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'OPEN',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS milestones (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      uncertainty_id TEXT REFERENCES uncertainties(id) ON DELETE SET NULL,
      title TEXT NOT NULL,
      purpose TEXT NOT NULL DEFAULT '',
      expected_learning TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'PROPOSED',
      deadline TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS evidence (
      id TEXT PRIMARY KEY,
      milestone_id TEXT NOT NULL REFERENCES milestones(id) ON DELETE CASCADE,
      claim TEXT NOT NULL,
      type TEXT NOT NULL,
      source TEXT,
      confidence INTEGER NOT NULL DEFAULT 0,
      user_status TEXT NOT NULL DEFAULT 'UNREVIEWED',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS decisions (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      milestone_id TEXT NOT NULL REFERENCES milestones(id) ON DELETE CASCADE,
      question TEXT NOT NULL,
      options TEXT NOT NULL DEFAULT '[]',
      selected_option TEXT,
      reasoning TEXT NOT NULL DEFAULT '',
      confidence INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'OPEN',
      evidence_at_time TEXT NOT NULL DEFAULT '[]',
      unknowns_at_time TEXT NOT NULL DEFAULT '[]',
      confidence_at_time INTEGER,
      deadline_at_time TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS feedback (
      id TEXT PRIMARY KEY,
      milestone_id TEXT NOT NULL REFERENCES milestones(id) ON DELETE CASCADE,
      decision_id TEXT REFERENCES decisions(id) ON DELETE SET NULL,
      expected_outcome TEXT NOT NULL DEFAULT '',
      actual_outcome TEXT NOT NULL DEFAULT '',
      learning TEXT NOT NULL DEFAULT '',
      confidence_before INTEGER,
      confidence_after INTEGER,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS belief_updates (
      id TEXT PRIMARY KEY,
      evidence_id TEXT NOT NULL UNIQUE REFERENCES evidence(id) ON DELETE CASCADE,
      uncertainty_id TEXT NOT NULL REFERENCES uncertainties(id) ON DELETE CASCADE,
      milestone_id TEXT NOT NULL REFERENCES milestones(id) ON DELETE CASCADE,
      evidence_type TEXT NOT NULL,
      evidence_strength INTEGER NOT NULL DEFAULT 0,
      supports_or_challenges TEXT NOT NULL,
      belief_update TEXT NOT NULL DEFAULT '',
      remaining_unknowns TEXT NOT NULL DEFAULT '[]',
      recommended_next_experiment TEXT NOT NULL DEFAULT '',
      prior_confidence INTEGER NOT NULL DEFAULT 0,
      suggested_confidence INTEGER NOT NULL DEFAULT 0,
      user_review_status TEXT NOT NULL DEFAULT 'UNREVIEWED',
      user_correction TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  globalForDb.judgmentMigrated = true;
}

export async function getReadyDb(): Promise<Db> {
  await ensureSchema();
  return getDb();
}
