
import "dotenv/config";
import { db } from "./server/db";
import { opticalCables, opticalCableLogs } from "./shared/schema";
import { eq, and, isNull, notInArray, exists } from "drizzle-orm";

async function checkOrphanedCables() {
    try {
        console.log("Checking for orphaned assigned cables...");

        const allCables = await db.select().from(opticalCables);
        const assignedCables = allCables.filter(c => c.status === 'assigned');

        console.log(`Total cables: ${allCables.length}`);
        console.log(`Total assigned cables: ${assignedCables.length}`);

        let orphanedCount = 0;

        for (const cable of assignedCables) {
            // Find if there is an 'assign' log for this cable
            const logs = await db.select()
                .from(opticalCableLogs)
                .where(and(
                    eq(opticalCableLogs.cableId, cable.id),
                    eq(opticalCableLogs.logType, 'assign')
                ));

            if (logs.length === 0) {
                console.log(`[ORPHAN] Cable ID: ${cable.id}, Drum: ${cable.drumNo}, Team: ${cable.currentTeamId} -> No assign log found.`);
                orphanedCount++;
            }
        }

        console.log(`Found ${orphanedCount} orphaned assigned cables.`);

        process.exit(0);
    } catch (error) {
        console.error("Error:", error);
        process.exit(1);
    }
}

checkOrphanedCables();
