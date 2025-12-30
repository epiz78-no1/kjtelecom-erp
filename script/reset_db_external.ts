import pg from 'pg';
const { Pool } = pg;
async function reset() {
    if (!process.env.DATABASE_URL) {
        console.error("DATABASE_URL is not set in environment or .env");
        process.exit(1);
    }

    console.log("Connecting to database...");
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: true // Neon usually requires SSL
    });

    const client = await pool.connect();
    try {
        console.log("Dropping public schema...");
        await client.query('DROP SCHEMA IF EXISTS public CASCADE');
        await client.query('CREATE SCHEMA public');
        console.log("✅ Public schema reset successfully.");
    } catch (err) {
        console.error("Error resetting DB:", err);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
}

reset();
