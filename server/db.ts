import { PGlite } from "@electric-sql/pglite";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";

const { Pool } = pg;

export let db: ReturnType<typeof drizzlePglite<typeof schema>> | ReturnType<typeof drizzlePg<typeof schema>>;

if (!process.env.DATABASE_URL) {
  // Use PGLite for local testing with persistent storage
  const client = new PGlite("./.data/pglite");
  db = drizzlePglite(client, { schema });
  console.log("Using PGLite (file-based) database at ./.data/pglite");
} else {
  // Use real Postgres for production/Supabase
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  db = drizzlePg(pool, { schema });
  console.log("Using PostgreSQL database");
}

export const pool = process.env.DATABASE_URL
  ? new Pool({ connectionString: process.env.DATABASE_URL })
  : null; // Pool is only for real Postgres
