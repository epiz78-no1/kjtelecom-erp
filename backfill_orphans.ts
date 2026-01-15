
import "dotenv/config";
import { db } from "./server/db";
import { opticalCables, opticalCableLogs } from "./shared/schema";
import { eq, and } from "drizzle-orm";

async function backfillOrphans() {
    try {
        console.log("Backfilling logs for orphaned assigned cables...");

        const allCables = await db.select().from(opticalCables);
        const assignedCables = allCables.filter(c => c.status === 'assigned');
        let backfilledCount = 0;

        for (const cable of assignedCables) {
            // Find if there is an 'assign' log for this cable
            const logs = await db.select()
                .from(opticalCableLogs)
                .where(and(
                    eq(opticalCableLogs.cableId, cable.id),
                    eq(opticalCableLogs.logType, 'assign')
                ));

            if (logs.length === 0) {
                console.log(`[BACKFILL] Cable ID: ${cable.id}, Drum: ${cable.drumNo}, Team: ${cable.currentTeamId}`);

                if (cable.currentTeamId) {
                    await db.insert(opticalCableLogs).values({
                        cableId: cable.id,
                        logType: 'assign',
                        teamId: cable.currentTeamId,
                        usageDate: cable.updatedAt ? new Date(cable.updatedAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
                        tenantId: cable.tenantId,
                        createdBy: cable.createdBy,
                        attributes: JSON.stringify({ remark: "시스템 자동 복구 (로그 누락)" }),
                        afterRemaining: cable.remainingLength
                    });
                    backfilledCount++;
                } else {
                    console.log(`  Skipping: No currentTeamId`);
                }
            }
        }

        console.log(`Backfilled ${backfilledCount} orphaned assigned cables.`);
        process.exit(0);
    } catch (error) {
        console.error("Error:", error);
        process.exit(1);
    }
}

backfillOrphans();
