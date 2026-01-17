import "dotenv/config";
import { db } from "../server/db.js";
import { opticalCableLogs } from "../shared/schema.js";
import { desc, eq, and } from "drizzle-orm";

async function checkProblematicLogs() {
    console.log("=== 수령팀이 없는 광케이블 출고 로그 확인 ===\n");

    const logs = await db
        .select()
        .from(opticalCableLogs)
        .where(eq(opticalCableLogs.logType, 'assign'))
        .orderBy(desc(opticalCableLogs.createdAt))
        .limit(10);

    console.log(`총 ${logs.length}개의 최근 출고 로그:\n`);

    logs.forEach((log, idx) => {
        console.log(`${idx + 1}. 로그 ID: ${log.id}`);
        console.log(`   케이블 ID: ${log.cableId}`);
        console.log(`   팀 ID: ${log.teamId || '❌ NULL'}`);
        console.log(`   생성일: ${log.createdAt}`);

        if (log.attributes) {
            const attrs = typeof log.attributes === 'string'
                ? JSON.parse(log.attributes)
                : log.attributes;
            console.log(`   수령자: ${attrs.recipient || '❌ 없음'}`);
            console.log(`   첨부파일: ${attrs.attachments?.length || 0}개`);
        }
        console.log('');
    });

    // teamId가 null인 로그 찾기
    const logsWithoutTeam = logs.filter(log => !log.teamId);

    if (logsWithoutTeam.length > 0) {
        console.log(`\n⚠️  팀 ID가 없는 로그 ${logsWithoutTeam.length}개 발견!`);
        logsWithoutTeam.forEach(log => {
            console.log(`   - 로그 ID: ${log.id}`);
            console.log(`     케이블 ID: ${log.cableId}`);
        });
    }

    process.exit(0);
}

checkProblematicLogs().catch(console.error);
