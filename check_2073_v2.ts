
import "dotenv/config";
import { db } from "./server/db.js";
import { materialUsageRecords } from "./shared/schema.js";
import { eq } from "drizzle-orm";
import { storage } from "./server/storage.js";

async function run() {
    console.log("Searching for records with productName '2073'...");

    const result = await db.select().from(materialUsageRecords).where(eq(materialUsageRecords.productName, "2073"));

    if (result.length === 0) {
        console.log("No records with productName '2073' found.");
        return;
    }

    console.log(`Found ${result.length} records.`);
    const record = result[0]; // Pick first one
    const id = record.id;
    const tenantId = record.tenantId;

    console.log(`Sampling Record ID: ${id}, TenantId: ${tenantId}`);
    console.log("Raw DB Record Keys:", Object.keys(record));
    console.log("Raw DB Record:", JSON.stringify(record, null, 2));

    // Test storage methods
    console.log("\n--- Method 1: getMaterialUsageRecords (List) ---");
    try {
        const list = await storage.getMaterialUsageRecords(tenantId);
        const foundInList = list.find(r => r.id === id);
        if (foundInList) {
            console.log("Found in List:");
            console.log(JSON.stringify(foundInList, null, 2));
        } else {
            console.log("Not found in List result!");
        }
    } catch (e) {
        console.error("Method 1 Error:", e);
    }

    console.log("\n--- Method 2: getMaterialUsageRecord (Single) ---");
    try {
        const single = await storage.getMaterialUsageRecord(id, tenantId);
        console.log("Result:");
        console.log(JSON.stringify(single, null, 2));
    } catch (e) {
        console.error("Method 2 Error:", e);
    }

    process.exit(0);
}

run().catch(e => {
    console.error(e);
    process.exit(1);
});
