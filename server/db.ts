import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { sql } from "drizzle-orm";
import * as schema from "../shared/schema.js";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL 환경 변수가 필요합니다. .env 파일에 설정해주세요.");
}

// PostgreSQL (Supabase) 사용
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: process.env.NODE_ENV === 'production' ? 3 : 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});
export const db = drizzle(pool, { schema });

console.log("PostgreSQL 데이터베이스 사용 중 (Supabase)");

/**
 * Execute a callback within a transaction that has the tenant context set.
 * This enforces RLS policies for the duration of the callback.
 */
export async function withTenant<T>(
  tenantId: string,
  callback: (tx: any) => Promise<T>
): Promise<T> {
  return db.transaction(async (tx) => {
    // Switch to non-superuser role to enforce RLS
    await tx.execute(sql`SET LOCAL ROLE app_user`);

    // Set the current tenant for RLS
    // 'local' means it only applies to the current transaction
    await tx.execute(sql`SELECT set_config('app.current_tenant', ${tenantId}, true)`);
    return callback(tx);
  });
}
