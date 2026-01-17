
import "dotenv/config";
import { db } from "./server/db.js";
import { materialUsageRecords } from "./shared/schema.js";
import { eq } from "drizzle-orm";
import { storage } from "./server/storage.js";

async function run() {
    console.log("Checking record 2073...");

    // 1. find tenantId for 2073 directly via DB
    const result = await db.select().from(materialUsageRecords).where(eq(materialUsageRecords.id, 2073));
    if (result.length === 0) {
        console.log("Record 2073 not found in DB directly.");
        return;
    }
    const record = result[0];
    const tenantId = record.tenantId;
    console.log(`Found record 2073 in DB. TenantId: ${tenantId}`);
    // Log raw DB record keys
    console.log("Raw DB Record Keys:", Object.keys(record));
    console.log("Raw DB Record:", record);

    // 2. Test storage methods
    console.log("\n--- Method 1: storage.getMaterialUsageRecords (List) for this tenant ---");
    try {
        const list = await storage.getMaterialUsageRecords(tenantId);
        const foundInList = list.find(r => r.id === 2073);
        if (foundInList) {
            console.log("Found in List:");
            console.log(JSON.stringify(foundInList, null, 2));
        } else {
            console.log("Not found in List result!");
        }
    } catch (e) {
        console.error("Error in Method 1:", e);
    }

    console.log("\n--- Method 2: storage.getMaterialUsageRecord (Single) ---");
    try {
        const single = await storage.getMaterialUsageRecord(2073, tenantId);
        console.log("Result:");
        console.log(JSON.stringify(single, null, 2));
    } catch (e) {
        console.error("Error in Method 2:", e);
    }

    process.exit(0);
}

run().catch(e => {
    console.error(e);
    process.exit(1);
});
