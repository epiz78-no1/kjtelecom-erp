
import { db } from "../server/db";
import { opticalCables, opticalCableLogs, teams } from "../shared/schema";
import { eq, desc } from "drizzle-orm";

async function checkCable() {
    console.log("Checking cable 3069...");

    // 1. Cable State
    const cable = await db.query.opticalCables.findFirst({
        where: eq(opticalCables.drumNo, "3069"),
        with: {
            currentTeam: true
        }
    });

    if (!cable) {
        console.log("Cable 3069 NOT FOUND");
        process.exit(0);
    }

    console.log("=== CABLE STATE ===");
    console.log(`ID: ${cable.id}`);
    console.log(`DrumNo: ${cable.drumNo}`);
    console.log(`Status: ${cable.status}`);
    console.log(`CurrentTeamId: ${cable.currentTeamId}`);
    console.log(`CurrentTeamName: ${cable.currentTeam?.name}`);
    console.log(`RemainingLength: ${cable.remainingLength}`);

    // 2. Teams List (to match IDs)
    console.log("\n=== TEAMS ===");
    const allTeams = await db.select().from(teams);
    allTeams.forEach(t => {
        console.log(`Team: ${t.name} (ID: ${t.id})`);
    });

    // 3. Logs
    console.log("\n=== RECENT LOGS ===");
    const logs = await db.query.opticalCableLogs.findMany({
        where: eq(opticalCableLogs.cableId, cable.id),
        orderBy: [desc(opticalCableLogs.createdAt)],
        limit: 5,
        with: {
            team: true
        }
    });

    logs.forEach(l => {
        console.log(`[${l.logType}] Date: ${l.usageDate}, TeamId: ${l.teamId}, TeamName: ${l.team?.name}, Used: ${l.usedLength}`);
    });

    process.exit(0);
}

checkCable().catch(console.error);
