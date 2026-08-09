/**
 * Apply db/schema.sql to the DATABASE_URL Postgres (Supabase).
 * Safe-ish for empty projects; re-run may error on existing types/tables — that's OK.
 *
 * Usage:
 *   set DATABASE_URL=postgresql://...
 *   npm run db:migrate
 */
import fs from "fs";
import path from "path";
import postgres from "postgres";

async function main() {
  const url = process.env.DATABASE_URL?.trim();
  if (!url || url.startsWith("file:")) {
    throw new Error("Set DATABASE_URL to your Supabase Postgres connection string.");
  }

  const schemaPath = path.join(process.cwd(), "db", "schema.sql");
  const sqlText = fs.readFileSync(schemaPath, "utf8");

  const sql = postgres(url, { max: 1, prepare: false });
  try {
    await sql.unsafe(sqlText);
    console.log("Schema applied successfully.");
  } finally {
    await sql.end({ timeout: 5 });
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
