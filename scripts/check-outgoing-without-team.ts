import "dotenv/config";
import { db } from "../server/db.js";
import { outgoingRecords } from "../shared/schema.js";
import { desc, sql } from "drizzle-orm";

async function checkOutgoingRecords() {
    console.log("=== 최근 일반 자재 출고 내역 확인 ===\n");

    const records = await db
        .select()
        .from(outgoingRecords)
        .orderBy(desc(outgoingRecords.date))
        .limit(5);

    console.log(`총 ${records.length}개의 최근 출고 내역:\n`);

    records.forEach((record, idx) => {
        console.log(`${idx + 1}. 레코드 ID: ${record.id}`);
        console.log(`   날짜: ${record.date}`);
        console.log(`   사업: ${record.division}`);
        console.log(`   팀 카테고리: ${record.teamCategory || '❌ NULL'}`);
        console.log(`   수령인: ${record.recipient || '❌ NULL'}`);
        console.log(`   품명: ${record.productName}`);
        console.log(`   규격: ${record.specification || '-'}`);
        console.log(`   수량: ${record.quantity}`);
        console.log('');
    });

    // teamCategory가 null인 레코드 찾기
    const recordsWithoutTeam = records.filter(r => !r.teamCategory);

    if (recordsWithoutTeam.length > 0) {
        console.log(`\n⚠️  팀 카테고리가 없는 레코드 ${recordsWithoutTeam.length}개 발견!`);
        recordsWithoutTeam.forEach(record => {
            console.log(`   - 레코드 ID: ${record.id}`);
            console.log(`     날짜: ${record.date}`);
            console.log(`     품명: ${record.productName}`);
        });
    }

    process.exit(0);
}

checkOutgoingRecords().catch(console.error);
