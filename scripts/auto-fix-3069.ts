
import 'dotenv/config';
import { db } from "../server/db";
import { opticalCables, opticalCableLogs } from "../shared/schema";
import { eq, desc } from "drizzle-orm";

async function fix() {
    console.log("Starting fix for cable 3069...");

    // 3069 케이블 찾기
    const cable = await db.query.opticalCables.findFirst({
        where: eq(opticalCables.drumNo, "3069")
    });

    if (!cable) {
        console.log("Error: Cable 3069 not found in DB.");
        process.exit(1);
    }

    console.log(`Current State -> Status: ${cable.status}, TeamID: ${cable.currentTeamId}`);

    // 최근 로그에서 팀 정보 찾기 (사용 로그든 반납 로그든 팀 정보가 있는 가장 최근 로그)
    const lastLog = await db.query.opticalCableLogs.findFirst({
        where: eq(opticalCableLogs.cableId, cable.id),
        orderBy: [desc(opticalCableLogs.createdAt)]
    });

    if (lastLog && lastLog.teamId) {
        console.log(`Found Team ID from last log: ${lastLog.teamId}`);

        await db.update(opticalCables)
            .set({
                status: 'assigned',
                currentTeamId: lastLog.teamId,
                remainingLength: cable.remainingLength // 값 유지
            })
            .where(eq(opticalCables.id, cable.id));

        console.log("Success: Cable 3069 state restored to 'assigned' with correct Team ID.");
    } else {
        console.log("Error: Could not find previous Team ID from logs.");
    }
    process.exit(0);
}

fix().catch(e => {
    console.error(e);
    process.exit(1);
});
