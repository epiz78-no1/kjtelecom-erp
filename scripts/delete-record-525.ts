import "dotenv/config";
import { db } from "../server/db.js";
import { outgoingRecords } from "../shared/schema.js";
import { eq } from "drizzle-orm";

async function deleteProblematicRecord() {
    const recordId = 525;

    console.log(`=== 레코드 ID ${recordId} 삭제 ===\n`);

    // 먼저 레코드 확인
    const record = await db
        .select()
        .from(outgoingRecords)
        .where(eq(outgoingRecords.id, recordId))
        .limit(1);

    if (record.length === 0) {
        console.log("레코드를 찾을 수 없습니다.");
        process.exit(0);
    }

    console.log("삭제할 레코드:");
    console.log(`  ID: ${record[0].id}`);
    console.log(`  날짜: ${record[0].date}`);
    console.log(`  팀 카테고리: ${record[0].teamCategory || 'NULL'}`);
    console.log(`  수령인: ${record[0].recipient || 'NULL'}`);
    console.log(`  품명: ${record[0].productName}`);

    // 삭제
    await db
        .delete(outgoingRecords)
        .where(eq(outgoingRecords.id, recordId));

    console.log("\n✅ 레코드가 성공적으로 삭제되었습니다.");

    process.exit(0);
}

deleteProblematicRecord().catch(console.error);
