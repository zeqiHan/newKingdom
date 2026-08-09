/**
 * Apply SQL to DATABASE_URL Postgres (Supabase).
 *
 * Usage:
 *   npm run db:migrate
 *   npm run db:migrate -- db/migrations/002_decision_gate.sql
 */
import fs from "fs";
import path from "path";
import postgres from "postgres";

async function main() {
  const url = process.env.DATABASE_URL?.trim();
  if (!url || url.startsWith("file:")) {
    throw new Error(
      "Set DATABASE_URL to your Supabase Postgres connection string.",
    );
  }

  const rel = process.argv[2] ?? path.join("db", "schema.sql");
  const schemaPath = path.isAbsolute(rel)
    ? rel
    : path.join(process.cwd(), rel);
  const sqlText = fs.readFileSync(schemaPath, "utf8");

  const sql = postgres(url, { max: 1, prepare: false });
  try {
    await sql.unsafe(sqlText);
    console.log(`Applied successfully: ${schemaPath}`);
  } finally {
    await sql.end({ timeout: 5 });
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
