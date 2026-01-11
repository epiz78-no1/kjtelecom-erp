
import 'dotenv/config';
import { db } from "../server/db";
import { opticalCables, teams } from "../shared/schema";
import { eq, like } from "drizzle-orm";

async function verify() {
    console.log("=== Verifying Cable 3069 ===");

    // 1. Cable State
    const cable = await db.query.opticalCables.findFirst({
        where: eq(opticalCables.drumNo, "3069"),
        with: {
            currentTeam: true
        }
    });

    if (!cable) {
        console.log("Cable 3069 NOT FOUND");
        return;
    }

    console.log(`Status: ${cable.status} (Should be 'assigned')`);
    console.log(`Current Team: ${cable.currentTeam?.name} (ID: ${cable.currentTeamId})`);

    // 2. '접속1팀' Verify
    const targetTeams = await db.select().from(teams).where(like(teams.name, "%접속1팀%"));
    console.log("\n=== Target Team Info ===");
    targetTeams.forEach(t => {
        console.log(`Team: ${t.name} (ID: ${t.id})`);
        if (t.id === cable.currentTeamId) {
            console.log(">>> MATCH! Cable is correctly assigned to this team.");
        } else {
            console.log(">>> MISMATCH! Cable is NOT assigned to this team.");
        }
    });

    process.exit(0);
}

verify().catch(console.error);
