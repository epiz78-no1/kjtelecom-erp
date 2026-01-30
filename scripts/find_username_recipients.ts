import dotenv from "dotenv";

// 환경 변수를 가장 먼저 로드
dotenv.config();

import { db } from "../server/db.js";
import { materialUsageRecords } from "../shared/schema.js";
import { like, or } from "drizzle-orm";

/**
 * 아이디 형식의 recipient를 찾는 스크립트
 */

async function findUsernameRecipients() {
    console.log("🔍 아이디 형식의 recipient를 검색합니다...\n");

    try {
        // parkjo, user, admin 등으로 시작하는 recipient 찾기
        const records = await db
            .select({
                id: materialUsageRecords.id,
                date: materialUsageRecords.date,
                productName: materialUsageRecords.productName,
                recipient: materialUsageRecords.recipient,
            })
            .from(materialUsageRecords)
            .where(
                or(
                    like(materialUsageRecords.recipient, 'parkjo%'),
                    like(materialUsageRecords.recipient, 'user%'),
                    like(materialUsageRecords.recipient, 'admin%'),
                    like(materialUsageRecords.recipient, 'epiz%'),
                    like(materialUsageRecords.recipient, 'field%'),
                    like(materialUsageRecords.recipient, 'inventory%'),
                    like(materialUsageRecords.recipient, 'readonly%')
                )
            )
            .orderBy(materialUsageRecords.date);

        console.log(`📦 총 ${records.length}개의 아이디 형식 데이터를 발견했습니다.\n`);

        if (records.length > 0) {
            console.log("📋 발견된 데이터:");
            console.log("=".repeat(80));
            records.forEach(record => {
                console.log(`   ID: ${record.id} | ${record.date} | ${record.productName.padEnd(30)} | ${record.recipient}`);
            });
            console.log("=".repeat(80));
        } else {
            console.log("✅ 아이디 형식의 recipient가 없습니다. 모두 실명으로 저장되어 있습니다!");
        }

    } catch (error) {
        console.error("❌ 오류 발생:", error);
        process.exit(1);
    }

    process.exit(0);
}

findUsernameRecipients();
