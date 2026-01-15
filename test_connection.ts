
import "dotenv/config";
import pg from "pg";

const { Pool } = pg;

const originalUrl = process.env.DATABASE_URL || "";
console.log("Original URL:", originalUrl.replace(/:([^:@]+)@/, ":****@"));

// Try Direct Connection Construct
// URL: postgresql://postgres:[PASSWORD]@db.[REF].supabase.co:5432/postgres
// Current User: postgres.mlousfbpasdjqskibakq
// Ref: mlousfbpasdjqskibakq

// Extract password properly
const urlParts = new URL(originalUrl);
const password = urlParts.password; // This should be decoded automatically by URL class? No, pg client needs it.
// Actually, let's just construct the direct URL manually.
const directHost = "db.mlousfbpasdjqskibakq.supabase.co";
const directUrl = originalUrl
    .replace("aws-1-ap-southeast-2.pooler.supabase.com", directHost)
    .replace("postgres.mlousfbpasdjqskibakq", "postgres"); // Direct connection usually just uses 'postgres' user, not project.user

console.log("Testing Direct URL:", directUrl.replace(/:([^:@]+)@/, ":****@"));

async function testConnection(connectionString: string, name: string) {
    console.log(`\nTesting ${name}...`);
    const pool = new Pool({
        connectionString,
        connectionTimeoutMillis: 5000,
    });
    try {
        const client = await pool.connect();
        const res = await client.query('SELECT NOW()');
        console.log(`✅ ${name} Success:`, res.rows[0]);
        client.release();
    } catch (err: any) {
        console.error(`❌ ${name} Failed:`, err.message);
        if (err.code) console.error(`   Code: ${err.code}`);
    } finally {
        await pool.end();
    }
}

async function run() {
    await testConnection(originalUrl, "Original (Pooler)");
    await testConnection(directUrl, "Direct Connection");
}

run();
