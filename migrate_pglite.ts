
import { db } from "./server/db";
import { users, tenants, userTenants, positions, invitations, divisions, teams, inventoryItems, outgoingRecords, materialUsageRecords, incomingRecords } from "./shared/schema";
import fs from "fs";
import path from "path";

async function migrate() {
    console.log("Starting manual migration for PGLite...");

    const migrationFiles = [
        "0000_smooth_forge.sql",
        "0001_sturdy_carnage.sql"
    ];

    for (const file of migrationFiles) {
        console.log(`Applying migration: ${file}`);
        const filePath = path.join(process.cwd(), "migrations", file);
        const sql = fs.readFileSync(filePath, "utf8");

        // Split by statement-breakpoint and execute each part
        const statements = sql.split("--> statement-breakpoint");
        for (let statement of statements) {
            statement = statement.trim();
            if (statement) {
                try {
                    // PGlite db.execute might be what we need if available, 
                    // but we can try running raw SQL through the driver
                    const client = (db as any).$client;
                    if (client && client.exec) {
                        await client.exec(statement);
                    } else {
                        // Fallback to try running via drizzle if exec not found
                        await (db as any).execute(statement);
                    }
                } catch (e: any) {
                    // Ignore "already exists" errors if re-running
                    if (e.message.includes("already exists") || e.message.includes("duplicate column")) {
                        console.log(`  Skipping existing: ${statement.substring(0, 50)}...`);
                    } else {
                        console.error(`  Error executing statement: ${statement.substring(0, 50)}...`);
                        console.error(e);
                    }
                }
            }
        }
    }

    console.log("Migration complete.");
}

migrate().catch(console.error);
