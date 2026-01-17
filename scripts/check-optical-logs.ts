
import { db } from "../server/db";
import { opticalCableLogs } from "../shared/schema";
import { desc, isNotNull } from "drizzle-orm";

async function main() {
    console.log("Fetching latest optical cable log with attachments...");
    // Just fetch, filter in JS because JSON query in Drizzle is tricky or requires sql
    const logs = await db.select()
        .from(opticalCableLogs)
        .orderBy(desc(opticalCableLogs.createdAt))
        .limit(50); // Fetch more to find one

    let found = 0;
    for (const log of logs) {
        if (!log.attributes) continue;
        const attrs = typeof log.attributes === 'string' ? JSON.parse(log.attributes) : log.attributes;

        // Check if attachments array exists and has items
        if ((attrs.attachments && Array.isArray(attrs.attachments) && attrs.attachments.length > 0) ||
            (attrs.attachment && typeof attrs.attachment === 'object' && Object.keys(attrs.attachment).length > 0)) {

            console.log(`Log ID: ${log.id}`);
            console.log("Attachments:", JSON.stringify(attrs.attachments || attrs.attachment, null, 2));
            console.log("--------------------------------");
            found++;
        }
    }
    console.log(`Found ${found} logs with attachments.`);
    process.exit(0);
}

main().catch(console.error);
