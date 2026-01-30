import dotenv from "dotenv";

// 환경 변수를 가장 먼저 로드
dotenv.config();

import { db } from "../server/db.js";
import { opticalCableLogs, users } from "../shared/schema.js";
import { eq } from "drizzle-orm";

/**
 * 광케이블 로그의 workerName을 아이디에서 실명으로 변경하는 스크립트
 */

async function updateOpticalWorkerNames() {
    console.log("🔄 광케이블 로그의 workerName을 실명으로 변경합니다...\n");

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

        // 2. 모든 광케이블 로그 조회
        const allLogs = await db
            .select()
            .from(opticalCableLogs);

        console.log(`📦 총 ${allLogs.length}개의 광케이블 로그를 조회했습니다.\n`);

        // 3. workerName이 아이디인 경우 실명으로 변경
        let updatedCount = 0;
        let skippedCount = 0;

        for (const log of allLogs) {
            const currentWorkerName = log.workerName;

            if (!currentWorkerName) {
                skippedCount++;
                continue;
            }

            // workerName이 usernameToName에 있는 경우 (아이디인 경우)
            if (usernameToName[currentWorkerName]) {
                const newName = usernameToName[currentWorkerName];

                await db
                    .update(opticalCableLogs)
                    .set({ workerName: newName })
                    .where(eq(opticalCableLogs.id, log.id));

                console.log(`✅ ID ${log.id}: "${currentWorkerName}" → "${newName}"`);
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
updateOpticalWorkerNames();
