
import "dotenv/config";
import pg from "pg";

// Manually parse and config to ensure no URL encoding issues
const config = {
    user: "postgres.mlousfbpasdjqskibakq",
    host: "aws-1-ap-southeast-2.pooler.supabase.com",
    database: "postgres",
    password: "chldhrwn7908?", // Decoded manually
    port: 5432,
    ssl: { rejectUnauthorized: false } // Required for some environments
};

async function testConfig() {
    console.log("Testing with explicit config object...");
    const { Pool } = pg;
    const pool = new Pool(config);
    try {
        const client = await pool.connect();
        const res = await client.query('SELECT NOW()');
        console.log("✅ Success with explicit config:", res.rows[0]);
        client.release();
    } catch (err: any) {
        console.error("❌ Failed with explicit config:", err.message);
        console.log("Error details:", err);
    } finally {
        await pool.end();
    }
}

// Also test with port 6543 (Transaction Pooler) just in case
async function testPort6543() {
    console.log("\nTesting Port 6543 (Transaction Pooler)...");
    const config6543 = { ...config, port: 6543 };
    const { Pool } = pg;
    const pool = new Pool(config6543);
    try {
        const client = await pool.connect();
        const res = await client.query('SELECT NOW()');
        console.log("✅ Success with Port 6543:", res.rows[0]);
        client.release();
    } catch (err: any) {
        console.error("❌ Failed with Port 6543:", err.message);
    } finally {
        await pool.end();
    }
}

// Test with literal password just in case
async function testLiteralPassword() {
    console.log("\nTesting with literal password 'chldhrwn7908%3F'...");
    const configLit = { ...config, password: "chldhrwn7908%3F" };
    const { Pool } = pg;
    const pool = new Pool(configLit);
    try {
        const client = await pool.connect();
        const res = await client.query('SELECT NOW()');
        console.log("✅ Success with literal password:", res.rows[0]);
        client.release();
    } catch (err: any) {
        console.error("❌ Failed with literal password:", err.message);
    } finally {
        await pool.end();
    }
}


async function run() {
    await testConfig();
    await testPort6543();
    await testLiteralPassword();
}

run();
