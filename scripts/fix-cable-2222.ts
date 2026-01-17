import "dotenv/config";
import { db } from "../server/db.js";
import { opticalCables, opticalCableLogs } from "../shared/schema.js";
import { eq, and } from "drizzle-orm";

async function fixCable2222() {
    const cableId = "4086c7e1-fbae-4eef-8f02-cf747301867f";

    console.log("=== 제조번호 2222 상태 복구 ===\n");

    // 1. 케이블 상태를 assigned로 복구
    await db.update(opticalCables)
        .set({
            status: 'assigned',
            currentTeamId: '5040f228-4d16-464b-a6ad-660d4f7c54db' // 컨슈1팀
        })
        .where(eq(opticalCables.id, cableId));

    console.log("✅ 케이블 상태를 'assigned'로 복구했습니다.");

    // 2. 잘못 생성된 반납 로그 삭제 (22:10:27에 생성된 것)
    const returnLogs = await db
        .select()
        .from(opticalCableLogs)
        .where(and(
            eq(opticalCableLogs.cableId, cableId),
            eq(opticalCableLogs.logType, 'return')
        ));

    if (returnLogs.length > 0) {
        const latestReturnLog = returnLogs[returnLogs.length - 1];
        await db.delete(opticalCableLogs)
            .where(eq(opticalCableLogs.id, latestReturnLog.id));

        console.log(`✅ 잘못 생성된 반납 로그를 삭제했습니다 (ID: ${latestReturnLog.id})`);
    }

    console.log("\n복구 완료!");
    process.exit(0);
}

fixCable2222().catch(console.error);
