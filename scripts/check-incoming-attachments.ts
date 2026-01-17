import { db } from "../server/db";
import { incomingRecords } from "../shared/schema";
import { desc, isNotNull } from "drizzle-orm";

async function main() {
    console.log("Fetching latest incoming records with attachments...");
    const records = await db.select()
        .from(incomingRecords)
        .orderBy(desc(incomingRecords.createdAt))
        .limit(20);

    let found = 0;
    for (const record of records) {
        if (!record.attributes) continue;
        const attrs = typeof record.attributes === 'string' ? JSON.parse(record.attributes) : record.attributes;

        if ((attrs.attachments && Array.isArray(attrs.attachments) && attrs.attachments.length > 0) ||
            (attrs.attachment && typeof attrs.attachment === 'object' && Object.keys(attrs.attachment).length > 0)) {

            console.log(`\nRecord ID: ${record.id}`);
            console.log("Product: ", record.productName);
            console.log("Attachments:", JSON.stringify(attrs.attachments || attrs.attachment, null, 2));
            console.log("--------------------------------");
            found++;
            if (found >= 3) break; // 처음 3개만 출력
        }
    }
    console.log(`\nFound ${found} records with attachments.`);
    process.exit(0);
}

main().catch(console.error);
