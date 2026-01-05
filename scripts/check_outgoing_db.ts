import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { outgoingRecords } from "../shared/schema";
import { desc } from "drizzle-orm";
import * as dotenv from "dotenv";

dotenv.config();

const connectionString = process.env.DATABASE_URL!;
const client = postgres(connectionString);
const db = drizzle(client);

async function checkRecentOutgoing() {
    console.log("최근 출고 내역 10건 조회 중...\n");

    const recent = await db
        .select()
        .from(outgoingRecords)
        .orderBy(desc(outgoingRecords.id))
        .limit(10);

    console.log(`총 ${recent.length}건 조회됨\n`);

    recent.forEach((record, index) => {
        console.log(`[${index + 1}] ID: ${record.id}`);
        console.log(`    출고일: ${record.date}`);
        console.log(`    공사명: "${record.projectName}"`);
        console.log(`    품명: ${record.productName}`);
        console.log(`    규격: ${record.specification}`);
        console.log(`    수량: ${record.quantity}`);
        console.log(`    수령인: ${record.recipient}`);
        console.log(`    팀: ${record.teamCategory}`);
        console.log("");
    });

    await client.end();
}

checkRecentOutgoing().catch(console.error);
