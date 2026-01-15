
import "dotenv/config";
import pg from "pg";

const config = {
    user: "postgres", // Try generic 'postgres' user
    host: "aws-1-ap-southeast-2.pooler.supabase.com",
    database: "postgres",
    password: "chldhrwn7908?",
    port: 5432,
    ssl: { rejectUnauthorized: false }
};

async function testGenericUser() {
    console.log("Testing 'postgres' user on Pooler Host...");
    const { Pool } = pg;
    const pool = new Pool(config);
    try {
        const client = await pool.connect();
        const res = await client.query('SELECT NOW()');
        console.log("✅ Success with generic user:", res.rows[0]);
        client.release();
    } catch (err: any) {
        console.error("❌ Failed with generic user:", err.message);
        if (err.code) console.log("Code:", err.code);
    } finally {
        await pool.end();
    }
}

testGenericUser();
