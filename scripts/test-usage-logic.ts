
import 'dotenv/config';
import { db } from "../server/db";
import { opticalCables, opticalCableLogs, teams } from "../shared/schema";
import { eq } from "drizzle-orm";
import { storage } from "../server/storage";

async function testUsageLogic() {
    console.log("=== Testing Usage Logic Team Retention ===");

    // 1. Setup: Create Dummy Data
    // Get a real team ID
    const team = await db.query.teams.findFirst();
    if (!team) {
        console.error("No teams found for testing");
        process.exit(1);
    }
    const teamId = team.id;
    const userId = (await db.query.users.findFirst())?.id || "test-user";
    const tenantId = (await db.query.tenants.findFirst())?.id;

    if (!tenantId) {
        console.error("No tenant found");
        process.exit(1);
    }

    console.log(`Using Tenant ID: ${tenantId}`);

    // Create Cable
    const cable = await storage.createOpticalCable({
        drumNo: "TEST-DRUM-9999",
        managementNo: "TEST-MGMT-9999",
        spec: "TEST",
        totalLength: "1000",
        remainingLength: 1000,
        status: "in_stock",
        coreCount: 24,
        category: "광케이블",
        tenantId: tenantId,
        createdBy: userId
    }, tenantId);

    console.log(`1. Created Cable ${cable.drumNo} (Status: ${cable.status})`);

    // 2. Assign
    await storage.createOpticalCableLog({
        cableId: cable.id,
        logType: "assign",
        teamId: teamId,
        usageDate: "2026-01-01",
        tenantId: tenantId,
        createdBy: userId
    }, tenantId);

    const assignedCable = await storage.getOpticalCable(cable.id, tenantId);
    console.log(`2. Assigned to Team (Status: ${assignedCable?.status}, TeamID: ${assignedCable?.currentTeamId})`);

    if (assignedCable?.currentTeamId !== teamId) {
        console.error("FAIL: Assignment failed to set team ID");
        await cleanup(cable.id);
        process.exit(1);
    }

    // 3. Usage (Partial)
    console.log("3. Registering Usage (100m used)...");
    await storage.createOpticalCableLog({
        cableId: cable.id,
        logType: "usage",
        installLength: 100,
        wasteLength: 0,
        usageDate: "2026-01-02",
        tenantId: tenantId,
        createdBy: userId
    }, tenantId);

    // 4. Verify
    const finalCable = await storage.getOpticalCable(cable.id, tenantId);
    console.log(`4. After Usage (Status: ${finalCable?.status}, TeamID: ${finalCable?.currentTeamId}, Remaining: ${finalCable?.remainingLength})`);

    const passed = finalCable?.status === 'assigned' && finalCable?.currentTeamId === teamId;

    if (passed) {
        console.log(">>> SUCCESS: Team ID retained after usage.");
    } else {
        console.error(">>> FAIL: Team ID lost or status incorrect.");
    }

    // 5. Cleanup
    await cleanup(cable.id);
    process.exit(0);
}

async function cleanup(id: string) {
    console.log("Cleaning up...");
    await db.delete(opticalCableLogs).where(eq(opticalCableLogs.cableId, id));
    await db.delete(opticalCables).where(eq(opticalCables.id, id));
}

testUsageLogic().catch(console.error);
