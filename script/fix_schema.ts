import { db } from "../server/db";
import { sql } from "drizzle-orm";

async function fix() {
    console.log("Comprehensive schema fix...");
    const commands = [
        "ALTER TABLE user_tenants ADD COLUMN IF NOT EXISTS permissions JSONB",
        "ALTER TABLE user_tenants ADD COLUMN IF NOT EXISTS team_id VARCHAR",
        "ALTER TABLE user_tenants ADD COLUMN IF NOT EXISTS position_id VARCHAR",
        "ALTER TABLE user_tenants ADD COLUMN IF NOT EXISTS division_id VARCHAR",
        "ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'general' NOT NULL",
        "ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS attributes TEXT",
        "ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS usage INTEGER DEFAULT 0",
        "ALTER TABLE incoming_records ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'general' NOT NULL",
        "ALTER TABLE incoming_records ADD COLUMN IF NOT EXISTS attributes TEXT",
        "ALTER TABLE incoming_records ADD COLUMN IF NOT EXISTS inventory_item_id INTEGER",
        "ALTER TABLE outgoing_records ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'general' NOT NULL",
        "ALTER TABLE outgoing_records ADD COLUMN IF NOT EXISTS attributes TEXT",
        "ALTER TABLE outgoing_records ADD COLUMN IF NOT EXISTS inventory_item_id INTEGER",
        "ALTER TABLE material_usage_records ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'general' NOT NULL",
        "ALTER TABLE material_usage_records ADD COLUMN IF NOT EXISTS attributes TEXT",
        "ALTER TABLE material_usage_records ADD COLUMN IF NOT EXISTS inventory_item_id INTEGER",
        "ALTER TABLE incoming_records ADD COLUMN IF NOT EXISTS remark TEXT",
        "ALTER TABLE outgoing_records ADD COLUMN IF NOT EXISTS remark TEXT",
        "ALTER TABLE material_usage_records ADD COLUMN IF NOT EXISTS remark TEXT",
        "ALTER TABLE incoming_records ADD COLUMN IF NOT EXISTS category TEXT DEFAULT '' NOT NULL",
        "ALTER TABLE outgoing_records ADD COLUMN IF NOT EXISTS category TEXT DEFAULT '' NOT NULL",
        "ALTER TABLE material_usage_records ADD COLUMN IF NOT EXISTS category TEXT DEFAULT '' NOT NULL"
    ];

    for (const cmd of commands) {
        try {
            await db.execute(sql.raw(cmd));
            console.log("Success: " + cmd);
        } catch (e: any) {
            console.log("Failed (or already exists): " + cmd + " -> " + e.message);
        }
    }
    process.exit(0);
}

fix();
