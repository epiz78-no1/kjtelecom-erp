import 'dotenv/config';
import pg from 'pg';

async function main() {
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) throw new Error("No DATABASE_URL");

    // Extract password and construct Direct URL
    // Original: postgresql://postgres.mlousfbpasdjqskibakq:PASSWORD@aws-1-ap-southeast-2.pooler.supabase.com:5432/postgres
    // Target: postgresql://postgres:PASSWORD@db.cistmojmpevmufpxxeeq.supabase.co:5432/postgres

    // Note: The username in pooler URL 'postgres.mlousfbpasdjqskibakq' is 'postgres' + '.' + 'ref'.
    // For direct connection, user is just 'postgres'.

    // Let's try to parse the password manually from the string to be safe
    const match = dbUrl.match(/:([^:@]+)@/);
    if (!match) {
        console.error("Could not parse password from URL");
        return;
    }
    let password = decodeURIComponent(match[1]); // Ensure we handle the %3F correctly

    console.log("Extracted Password (masked):", password.substring(0, 3) + "****" + password.slice(-1));

    // Ref from SUPABASE_URL
    const supabaseUrl = process.env.SUPABASE_URL;
    const ref = supabaseUrl?.split('//')[1].split('.')[0];

    if (!ref) {
        console.error("Could not extract Ref from SUPABASE_URL");
        return;
    }

    const directUrl = `postgresql://postgres:${encodeURIComponent(password)}@db.${ref}.supabase.co:5432/postgres`;
    console.log("Trying Direct URL:", directUrl.replace(password, "****"));

    const client = new pg.Client({
        connectionString: directUrl,
        ssl: { rejectUnauthorized: false } // Required for Supabase direct
    });

    try {
        await client.connect();
        console.log("✅ Direct Connection Successful!");

        const res = await client.query('SELECT version()');
        console.log("DB Version:", res.rows[0]);

        // Search again for the error message
        const searchRes = await client.query(`
             SELECT proname, prosrc 
            FROM pg_proc 
            WHERE prosrc ILIKE '%Tenant or user not found%'
        `);
        console.log("Search Result:", searchRes.rows);

        await client.end();
    } catch (e) {
        console.error("❌ Direct Connection Failed:", e);
    }
}

main();
