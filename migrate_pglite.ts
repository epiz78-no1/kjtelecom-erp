
import { db } from "./server/db";
import fs from "fs";
import path from "path";

async function migrate() {
    console.log("Starting manual migration for PGLite...");

    const migrationsDir = path.join(process.cwd(), "migrations");
    if (!fs.existsSync(migrationsDir)) {
        console.error("Migrations directory not found.");
        return;
    }

    const migrationFiles = fs.readdirSync(migrationsDir)
        .filter(file => file.endsWith(".sql"))
        .sort();

    for (const file of migrationFiles) {
        console.log(`Applying migration: ${file}`);
        const filePath = path.join(migrationsDir, file);
        const sql = fs.readFileSync(filePath, "utf8");

        const statements = sql.split("--> statement-breakpoint");
        for (let statement of statements) {
            statement = statement.trim();
            if (statement) {
                try {
                    const client = (db as any).$client;
                    if (client && client.exec) {
                        await client.exec(statement);
                    } else {
                        await (db as any).execute(statement);
                    }
                } catch (e: any) {
                    if (e.message.includes("already exists") || e.message.includes("duplicate column") || e.message.includes("already a foreign key")) {
                        console.log(`  Skipping: ${statement.substring(0, 50)}...`);
                    } else {
                        console.error(`  Error: ${statement.substring(0, 50)}...`);
                        console.error(e);
                    }
                }
            }
        }
    }

    console.log("Migration complete.");
}

migrate().catch(console.error);
