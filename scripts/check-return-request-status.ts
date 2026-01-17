import "dotenv/config";
import { db } from "../server/db.js";
import { opticalCables, opticalCableLogs } from "../shared/schema.js";
import { desc, eq } from "drizzle-orm";

async function checkReturnRequestStatus() {
    console.log("=== 최근 반납 신청 확인 ===\n");

    // 최근 반납 로그 확인
    const returnLogs = await db
        .select()
        .from(opticalCableLogs)
        .where(eq(opticalCableLogs.logType, 'return'))
        .orderBy(desc(opticalCableLogs.createdAt))
        .limit(3);

    console.log(`최근 반납 로그 ${returnLogs.length}개:\n`);

    for (const log of returnLogs) {
        console.log(`로그 ID: ${log.id}`);
        console.log(`케이블 ID: ${log.cableId}`);
        console.log(`생성일: ${log.createdAt}`);

        // 해당 케이블 정보 조회
        const cable = await db
            .select()
            .from(opticalCables)
            .where(eq(opticalCables.id, log.cableId))
            .limit(1);

        if (cable.length > 0) {
            console.log(`\n케이블 정보:`);
            console.log(`  제조번호: ${cable[0].drumNo}`);
            console.log(`  상태: ${cable[0].status}`);
            console.log(`  반납 요청 상태: ${cable[0].returnRequestStatus || '❌ NULL'}`);
        }
        console.log('\n---\n');
    }

    process.exit(0);
}

checkReturnRequestStatus().catch(console.error);
