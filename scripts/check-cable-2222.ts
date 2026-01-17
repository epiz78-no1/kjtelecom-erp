import "dotenv/config";
import { db } from "../server/db.js";
import { opticalCables, opticalCableLogs } from "../shared/schema.js";
import { eq, desc } from "drizzle-orm";

async function checkCable2222() {
    console.log("=== 제조번호 2222 케이블 확인 ===\n");

    // 케이블 정보 조회
    const cables = await db
        .select()
        .from(opticalCables)
        .where(eq(opticalCables.drumNo, '2222'))
        .limit(1);

    if (cables.length === 0) {
        console.log("제조번호 2222 케이블을 찾을 수 없습니다.");
        process.exit(0);
    }

    const cable = cables[0];

    console.log("케이블 정보:");
    console.log(`  ID: ${cable.id}`);
    console.log(`  제조번호: ${cable.drumNo}`);
    console.log(`  상태: ${cable.status}`);
    console.log(`  반납 요청 상태: ${cable.returnRequestStatus || '❌ NULL'}`);
    console.log(`  잔량: ${cable.remainingLength}m`);

    // 최근 로그 조회
    console.log("\n최근 로그 5개:");
    const logs = await db
        .select()
        .from(opticalCableLogs)
        .where(eq(opticalCableLogs.cableId, cable.id))
        .orderBy(desc(opticalCableLogs.createdAt))
        .limit(5);

    logs.forEach((log, idx) => {
        console.log(`\n${idx + 1}. ${log.logType} (${log.createdAt})`);
        if (log.attributes) {
            try {
                const attrs = typeof log.attributes === 'string'
                    ? JSON.parse(log.attributes)
                    : log.attributes;
                console.log(`   속성: ${JSON.stringify(attrs, null, 2)}`);
            } catch (e) { }
        }
    });

    process.exit(0);
}

checkCable2222().catch(console.error);
