import "dotenv/config";
import { db } from "./server/db";
import { opticalCableLogs, materialUsageRecords } from "./shared/schema";
import { desc, eq, sql } from "drizzle-orm";

async function checkDataSizes() {
    console.log("Checking Optical Cable Logs...");
    const logs = await db.select({
        id: opticalCableLogs.id,
        attrLength: sql<number>`length(${opticalCableLogs.attributes})`,
        attributesStart: sql<string>`substring(${opticalCableLogs.attributes} from 1 for 100)`
    })
        .from(opticalCableLogs)
        .orderBy(desc(opticalCableLogs.createdAt))
        .limit(5);

    console.log("Top 5 Optical Logs:");
    logs.forEach(l => console.log(`ID: ${l.id}, Size: ${l.attrLength} bytes, Start: ${l.attributesStart}`));

    console.log("\nChecking Material Usage Records...");
    const materials = await db.select({
        id: materialUsageRecords.id,
        attrLength: sql<number>`length(${materialUsageRecords.attributes})`,
        attributesStart: sql<string>`substring(${materialUsageRecords.attributes} from 1 for 100)`
    })
        .from(materialUsageRecords)
        .orderBy(desc(materialUsageRecords.date))
        .limit(5);

    console.log("Top 5 Material Records:");
    materials.forEach(m => console.log(`ID: ${m.id}, Size: ${m.attrLength} bytes, Start: ${m.attributesStart}`));

    process.exit(0);
}

checkDataSizes().catch(console.error);
