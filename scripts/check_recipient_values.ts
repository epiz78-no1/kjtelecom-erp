import dotenv from "dotenv";

// 환경 변수를 가장 먼저 로드
dotenv.config();

import { db } from "../server/db.js";
import { materialUsageRecords } from "../shared/schema.js";

/**
 * 자재 사용등록 데이터의 recipient 값을 확인하는 스크립트
 */

async function checkRecipientValues() {
    console.log("🔍 자재 사용등록 데이터의 recipient 값을 확인합니다...\n");

    try {
        const allRecords = await db
            .select({
                id: materialUsageRecords.id,
                date: materialUsageRecords.date,
                productName: materialUsageRecords.productName,
                recipient: materialUsageRecords.recipient,
            })
            .from(materialUsageRecords)
            .orderBy(materialUsageRecords.date);

        console.log(`📦 총 ${allRecords.length}개의 데이터를 조회했습니다.\n`);

        // recipient 값들을 그룹화
        const recipientCounts: Record<string, number> = {};

        allRecords.forEach(record => {
            const recipient = record.recipient;
            recipientCounts[recipient] = (recipientCounts[recipient] || 0) + 1;
        });

        console.log("📊 Recipient 값 분포:");
        console.log("=".repeat(60));
        Object.entries(recipientCounts)
            .sort((a, b) => b[1] - a[1])
            .forEach(([recipient, count]) => {
                console.log(`   ${recipient.padEnd(20)} : ${count}건`);
            });
        console.log("=".repeat(60));

        console.log("\n📋 최근 10개 데이터:");
        console.log("=".repeat(80));
        allRecords.slice(-10).forEach(record => {
            console.log(`   ${record.date} | ${record.productName.padEnd(30)} | ${record.recipient}`);
        });
        console.log("=".repeat(80));

    } catch (error) {
        console.error("❌ 오류 발생:", error);
        process.exit(1);
    }

    process.exit(0);
}

checkRecipientValues();
