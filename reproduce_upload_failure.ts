
import "dotenv/config";
import { db } from "./server/db.ts";
import { incomingRecords } from "./shared/schema.ts";
import { desc, eq } from "drizzle-orm";
import { processAttachments } from "./server/routes/inventory-helpers.ts";

async function reproduce() {
    console.log("🔍 Fetching Record 42...");
    const record = await db.select().from(incomingRecords).where(eq(incomingRecords.id, 42)).limit(1);

    if (!record || record.length === 0) {
        console.error("❌ Record 42 not found");
        process.exit(1);
    }

    const r = record[0];
    let attrs: any = r.attributes;
    if (typeof attrs === 'string') {
        attrs = JSON.parse(attrs);
    }

    if (!attrs?.attachments || attrs.attachments.length === 0) {
        console.error("❌ No attachments in Record 42");
        process.exit(1);
    }

    console.log("📦 Found attachments:", attrs.attachments.length);
    console.log("🔄 Attempting to re-process attachments...");

    try {
        const result = await processAttachments(attrs.attachments);
        console.log("✅ Process Result:", JSON.stringify(result, null, 2));
    } catch (e) {
        console.error("❌ Process Failed:", e);
    }

    process.exit(0);
}

reproduce();
