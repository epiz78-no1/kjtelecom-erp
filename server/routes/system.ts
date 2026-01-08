import type { Express } from "express";
import { db } from "../db.js";
import { sql } from "drizzle-orm";
import { requireAuth, requireAdmin } from "../middleware/auth.js";

export function registerSystemRoutes(app: Express) {
    // DB migrations and initialization are handled by SQL files and db_init.ts
    // Manual trigger for debugging if needed: POST /api/debug/init
    app.post("/api/debug/init", async (req, res) => {
        try {
            const { ensureUsers, backfillInventory } = await import("../db_init.js");
            await ensureUsers();
            await backfillInventory();
            res.json({ success: true, message: "DB Initialized" });
        } catch (error: any) {
            console.error("Init failed:", error);
            res.status(500).json({ error: error.message });
        }
    });

    app.get("/api/debug/db-schema", requireAuth, requireAdmin, async (req, res) => {
        try {
            // Query specific table schema information
            // Drizzle ORM doesn't have a direct schema inspector, using raw SQL
            const result = await db.execute(sql`
        SELECT table_name, column_name, data_type, udt_name
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name IN ('inventory_items', 'outgoing_records', 'incoming_records', 'material_usage_records')
        ORDER BY table_name, ordinal_position;
      `);
            res.json(result.rows);
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    });
}
