import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { sql } from "drizzle-orm";

const { Pool } = pg;

interface SchemaColumn {
    table_name: string;
    column_name: string;
    data_type: string;
    udt_name: string;
}

async function getDBSchema(connectionString: string): Promise<SchemaColumn[]> {
    const pool = new Pool({ connectionString, max: 1 });
    const db = drizzle(pool);

    try {
        const result = await db.execute(sql`
      SELECT table_name, column_name, data_type, udt_name
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name IN ('inventory_items', 'outgoing_records', 'incoming_records', 'material_usage_records', 'tenants', 'users', 'user_tenants', 'teams', 'divisions')
      ORDER BY table_name, ordinal_position;
    `);

        return result.rows as SchemaColumn[];
    } finally {
        await pool.end();
    }
}

function compareSchemas(devSchema: SchemaColumn[], prodSchema: SchemaColumn[]): { identical: boolean; differences: string[] } {
    const differences: string[] = [];

    // Create maps for easier comparison
    const devMap = new Map<string, SchemaColumn>();
    const prodMap = new Map<string, SchemaColumn>();

    devSchema.forEach(col => {
        const key = `${col.table_name}.${col.column_name}`;
        devMap.set(key, col);
    });

    prodSchema.forEach(col => {
        const key = `${col.table_name}.${col.column_name}`;
        prodMap.set(key, col);
    });

    // Check for columns in dev but not in prod
    devMap.forEach((col, key) => {
        if (!prodMap.has(key)) {
            differences.push(`❌ Missing in PROD: ${key} (${col.data_type})`);
        } else {
            const prodCol = prodMap.get(key)!;
            if (col.data_type !== prodCol.data_type || col.udt_name !== prodCol.udt_name) {
                differences.push(`⚠️  Type mismatch: ${key} - DEV: ${col.data_type}(${col.udt_name}) vs PROD: ${prodCol.data_type}(${prodCol.udt_name})`);
            }
        }
    });

    // Check for columns in prod but not in dev
    prodMap.forEach((col, key) => {
        if (!devMap.has(key)) {
            differences.push(`❌ Extra in PROD: ${key} (${col.data_type})`);
        }
    });

    return {
        identical: differences.length === 0,
        differences
    };
}

async function main() {
    console.log("🔍 DB Schema Verification Starting...\n");

    const devDbUrl = process.env.DATABASE_URL;
    const prodDbUrl = process.env.DATABASE_URL_PROD;

    if (!devDbUrl) {
        console.error("❌ ERROR: DATABASE_URL (dev) not set");
        process.exit(1);
    }

    if (!prodDbUrl) {
        console.error("❌ ERROR: DATABASE_URL_PROD not set");
        console.log("ℹ️  Set it with: export DATABASE_URL_PROD='your-prod-db-url'");
        process.exit(1);
    }

    console.log("📊 Fetching DEV schema...");
    const devSchema = await getDBSchema(devDbUrl);
    console.log(`✅ DEV: ${devSchema.length} columns found\n`);

    console.log("📊 Fetching PROD schema...");
    const prodSchema = await getDBSchema(prodDbUrl);
    console.log(`✅ PROD: ${prodSchema.length} columns found\n`);

    console.log("🔄 Comparing schemas...\n");
    const comparison = compareSchemas(devSchema, prodSchema);

    if (comparison.identical) {
        console.log("✅ ✅ ✅ SCHEMAS ARE IDENTICAL ✅ ✅ ✅");
        console.log("🚀 Safe to deploy to production!\n");
        process.exit(0);
    } else {
        console.log("❌ ❌ ❌ SCHEMA MISMATCH DETECTED ❌ ❌ ❌\n");
        console.log("Differences found:");
        comparison.differences.forEach(diff => console.log(`  ${diff}`));
        console.log("\n⛔ DEPLOYMENT BLOCKED");
        console.log("📝 Please run migrations on PROD to match DEV schema before deploying.\n");
        process.exit(1);
    }
}

main().catch(err => {
    console.error("💥 Fatal error:", err);
    process.exit(1);
});
