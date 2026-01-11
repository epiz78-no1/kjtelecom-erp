
import 'dotenv/config';
import { db } from "../server/db";
import { opticalCables, opticalCableLogs } from "../shared/schema";
import { eq, ne, isNull, desc, and } from "drizzle-orm";

async function fixAll() {
    console.log("=== Starting Bulk Fix for Optical Cables ===");

    // 1. currentTeamId가 없는데 in_stock이 아닌 케이블 조회 (비정상 상태)
    const brokenCables = await db.query.opticalCables.findMany({
        where: and(
            isNull(opticalCables.currentTeamId),
            ne(opticalCables.status, 'in_stock')
        )
    });

    console.log(`Found ${brokenCables.length} cables with missing team assignment.`);

    let fixedCount = 0;

    for (const cable of brokenCables) {
        console.log(`Processing Cable ${cable.drumNo} (Status: ${cable.status})...`);

        // 최근 로그에서 팀 정보 추적
        const lastLog = await db.query.opticalCableLogs.findFirst({
            where: and(
                eq(opticalCableLogs.cableId, cable.id),
                // teamId가 있는 로그만 (폐기 로그 등은 없을 수 있음)
            ),
            orderBy: [desc(opticalCableLogs.createdAt)]
        });

        // 로그를 뒤져서라도 팀 ID가 있는 가장 최근 로그 찾기
        // 위 쿼리에서 필터링 안하고 가져온 뒤 루프 돌면서 찾음 (더 정확)
        const allLogs = await db.query.opticalCableLogs.findMany({
            where: eq(opticalCableLogs.cableId, cable.id),
            orderBy: [desc(opticalCableLogs.createdAt)]
        });

        const validLog = allLogs.find(l => l.teamId);

        if (validLog && validLog.teamId) {
            console.log(`  -> Restoring team from Log (${validLog.logType}, ${validLog.usageDate}) -> TeamID: ${validLog.teamId}`);

            // 상태도 assigned로 강제 복구 (used_up 상태여도 사용 취소 후라면 assigned여야 함, 하지만 여기서 일괄로 assigned로 바꾸진 말고 teamId만 복구)
            // 단, 사용자가 "목록에 안 보인다"고 했으므로 assigned여야 보임.
            // used_up 상태인 경우 -> 사용 완료된 것. 이걸 목록에 보이게 하려면? assigned로 바꿔야 하나?
            // "사용 등록" 목록에는 assigned만 뜸. used_up은 안 뜸.
            // 사용자가 "삭제했다"고 했음. 사용 내역을 삭제했으면 다시 assigned로 돌아가야 했는데 안 돌아간 것(아까 3069 케이스).
            // 그러므로 여기서 status도 'assigned'로 복구하는 게 안전함 (단, 잔량이 폐기 수준이면 used_up이 맞을 수도 있지만...)
            // 잔량이 있으면 assigned로.

            let newStatus = cable.status;
            if (cable.remainingLength > 0 && cable.status === 'used_up') {
                newStatus = 'assigned';
                console.log(`  -> Status corrected from 'used_up' to 'assigned' (Has remaining length)`);
            }

            await db.update(opticalCables)
                .set({
                    currentTeamId: validLog.teamId,
                    status: newStatus
                })
                .where(eq(opticalCables.id, cable.id));

            fixedCount++;
        } else {
            console.log(`  -> No valid team log found. Skipping.`);
        }
    }

    console.log(`=== Complete. Fixed ${fixedCount} cables. ===`);
    process.exit(0);
}

fixAll().catch(e => {
    console.error(e);
    process.exit(1);
});
