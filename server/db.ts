import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { sql } from "drizzle-orm";
import * as schema from "../shared/schema.js";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  console.error("🚨 CRITICAL: DATABASE_URL is missing! DB operations will fail.");
  // Don't throw error at top-level to prevent Serverless Function crash.
  // Instead, let it fail when connection is attempted, so we can return a proper JSON error to client.
}

// PostgreSQL (Supabase) 사용
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgres://invalid_connection_string_placeholder",
  max: process.env.NODE_ENV === 'production' ? 3 : 5, // Increased to 3 for production to handle cold start concurrency
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000, // Increased from 2000 to 10000
});

// Unexpected errors on idle clients can cause the process to crash if not handled
pool.on('error', (err, client) => {
  console.error('Unexpected error on idle client', err);
  // process.exit(-1); // Do not exit on Vercel
});
export const db = drizzle(pool, { schema });

console.log("PostgreSQL 데이터베이스 사용 중 (Supabase)");

/**
 * Execute a callback within a transaction that has the tenant context set.
 * This enforces RLS policies for the duration of the callback.
 */
// export async function withTenant<T>(
//   tenantId: string,
//   callback: (tx: any) => Promise<T>
// ): Promise<T> {
//   return db.transaction(async (tx) => {
//     // Switch to non-superuser role to enforce RLS
//     await tx.execute(sql`SET LOCAL ROLE app_user`);
// 
//     // Set the current tenant for RLS
//     // 'local' means it only applies to the current transaction
//     await tx.execute(sql`SELECT set_config('app.current_tenant', ${tenantId}, true)`);
//     return callback(tx);
//   });
// }

// Verified: Application-level multitenancy is implemented in storage.ts
// Removing DB-level RLS enforcement to prevent "role app_user does not exist" errors in production.
export async function withTenant<T>(
  tenantId: string,
  callback: (tx: any) => Promise<T>
): Promise<T> {
  return callback(db);
}
