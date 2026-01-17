
import "dotenv/config";
import { db } from "./server/db.js";
import { opticalCableLogs } from "./shared/schema.js";
import { desc } from "drizzle-orm";
import { storage } from "./server/storage.js";

async function run() {
    console.log("Fetching latest optical cable log for verification...");

    // Get latest log to find a valid ID
    const logs = await db.select().from(opticalCableLogs).orderBy(desc(opticalCableLogs.createdAt)).limit(1);

    if (logs.length === 0) {
        console.log("No optical cable logs found in DB.");
        return;
    }

    const log = logs[0];
    const logId = log.id;
    const tenantId = log.tenantId;

    console.log(`Target Log ID: ${logId}`);
    console.log(`Tenant ID: ${tenantId}`);

    console.log("\n--- Executing storage.getOpticalCableLog(logId, tenantId) ---");
    try {
        const result = await storage.getOpticalCableLog(logId, tenantId);
        console.log("API Result (Simulated):");
        console.log(JSON.stringify(result, null, 2));

        if (result) {
            console.log("\nVerification SUCCESS: Data retrieved successfully.");
            console.log(`Cable ID: ${result.cableId} (Type: ${typeof result.cableId})`);
            console.log(`Project Name Usage: ${result.projectNameUsage}`);
        } else {
            console.log("\nVerification FAILED: Result is null/undefined.");
        }
    } catch (e) {
        console.error("\nVerification ERROR:", e);
    }

    process.exit(0);
}

run().catch(e => {
    console.error(e);
    process.exit(1);
});
