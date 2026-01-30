import dotenv from "dotenv";

// 환경 변수를 가장 먼저 로드
dotenv.config();

import { db } from "../server/db.js";
import { materialUsageRecords, users, userTenants } from "../shared/schema.js";
import { eq, and, sql } from "drizzle-orm";

/**
 * 자재 사용등록 데이터의 recipient 필드를 아이디에서 실명으로 변경하는 스크립트
 * 
 * 사용법:
 * tsx scripts/update_recipient_to_name.ts
 */

async function updateRecipientToName() {
    console.log("🔄 자재 사용등록 데이터의 recipient를 실명으로 변경합니다...\n");

    try {
        // 1. 모든 사용자 정보 조회 (username -> name 매핑)
        const allUsers = await db
            .select({
                username: users.username,
                name: users.name,
            })
            .from(users);

        console.log(`📋 총 ${allUsers.length}명의 사용자 정보를 조회했습니다.\n`);

        // username -> name 매핑 객체 생성
        const usernameToName: Record<string, string> = {};
        allUsers.forEach(user => {
            usernameToName[user.username] = user.name;
        });

        console.log("📌 사용자 매핑:");
        Object.entries(usernameToName).forEach(([username, name]) => {
            console.log(`   ${username} → ${name}`);
        });
        console.log();

        // 2. 모든 자재 사용등록 데이터 조회
        const allRecords = await db
            .select()
            .from(materialUsageRecords);

        console.log(`📦 총 ${allRecords.length}개의 자재 사용등록 데이터를 조회했습니다.\n`);

        // 3. recipient가 아이디인 경우 실명으로 변경
        let updatedCount = 0;
        let skippedCount = 0;

        for (const record of allRecords) {
            const currentRecipient = record.recipient;

            // recipient가 usernameToName에 있는 경우 (아이디인 경우)
            if (usernameToName[currentRecipient]) {
                const newName = usernameToName[currentRecipient];

                await db
                    .update(materialUsageRecords)
                    .set({ recipient: newName })
                    .where(eq(materialUsageRecords.id, record.id));

                console.log(`✅ ID ${record.id}: "${currentRecipient}" → "${newName}"`);
                updatedCount++;
            } else {
                // 이미 실명이거나 매핑되지 않은 경우
                skippedCount++;
            }
        }

        console.log("\n" + "=".repeat(60));
        console.log(`✨ 작업 완료!`);
        console.log(`   - 업데이트: ${updatedCount}건`);
        console.log(`   - 건너뜀: ${skippedCount}건`);
        console.log("=".repeat(60));

    } catch (error) {
        console.error("❌ 오류 발생:", error);
        process.exit(1);
    }

    process.exit(0);
}

// 스크립트 실행
updateRecipientToName();
