import 'dotenv/config';
import { db, pool } from './server/db.js';
import { sql } from 'drizzle-orm';

async function main() {
    console.log("🔍 Checking Database Connection...");
    try {
        // 1. Check basic connection
        const res = await db.execute(sql`SELECT 1 as connected`);
        console.log("✅ Connection successful:", res[0]);

        // 2. Search for the error string in functions/triggers
        console.log("🔍 Searching for 'Tenant or user not found' in DB...");

        const searchResult = await db.execute(sql`
            SELECT proname, prosrc 
            FROM pg_proc 
            WHERE prosrc ILIKE '%Tenant or user not found%'
        `);

        if (searchResult.length > 0) {
            console.log("🚨 Found in Functions:", searchResult);
        } else {
            console.log("ℹ️ Not found in stored procedures.");
        }

        // 3. Check trigger definitions logic (indirectly)
        // Check if there are any specific triggers on 'users' or 'tenants' that might fire
        const triggers = await db.execute(sql`
            SELECT tgname, tgrelid::regclass 
            FROM pg_trigger
            WHERE tgrelid::regclass::text IN ('users', 'tenants', 'user_tenants');
        `);
        console.log("ℹ️ Triggers on key tables:", triggers);

    } catch (e: any) {
        console.error("❌ Database Error:", e);
        if (e.message) console.error("Error Message:", e.message);
    } finally {
        await pool.end();
    }
}

main();
