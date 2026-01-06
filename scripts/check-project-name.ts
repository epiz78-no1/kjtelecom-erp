import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { materialUsageRecords } from "../shared/schema";
import { desc } from "drizzle-orm";

const DATABASE_URL = process.env.DATABASE_URL!;
const client = postgres(DATABASE_URL);
const db = drizzle(client);

async function checkProjectName() {
    console.log("🔍 최근 사용등록 내역 5건 조회 (공사명 확인)...\n");

    const records = await db
        .select({
            id: materialUsageRecords.id,
            date: materialUsageRecords.date,
            productName: materialUsageRecords.productName,
            projectName: materialUsageRecords.projectName,
            recipient: materialUsageRecords.recipient,
        })
        .from(materialUsageRecords)
        .orderBy(desc(materialUsageRecords.id))
        .limit(5);

    if (records.length === 0) {
        console.log("❌ 사용등록 내역이 없습니다.");
        await client.end();
        return;
    }

    console.table(records);

    const emptyProjectNames = records.filter(r => !r.projectName || r.projectName.trim() === "");

    if (emptyProjectNames.length > 0) {
        console.log(`\n⚠️  공사명이 비어있는 레코드: ${emptyProjectNames.length}건`);
        emptyProjectNames.forEach(r => {
            console.log(`   - ID ${r.id}: ${r.productName} (${r.date})`);
        });
    } else {
        console.log("\n✅ 모든 레코드에 공사명이 정상적으로 저장되어 있습니다.");
    }

    await client.end();
}

checkProjectName().catch(console.error);
