import dotenv from "dotenv";

// 환경 변수를 가장 먼저 로드
dotenv.config();

import { db } from "../server/db.js";
import { opticalCableLogs } from "../shared/schema.js";
import { like, or } from "drizzle-orm";

/**
 * 광케이블 로그에서 아이디 형식의 workerName을 찾는 스크립트
 */

async function findOpticalUsernameWorkers() {
    console.log("🔍 광케이블 로그에서 아이디 형식의 workerName을 검색합니다...\n");

    try {
        // parkjo, user, admin 등으로 시작하는 workerName 찾기
        const records = await db
            .select({
                id: opticalCableLogs.id,
                usageDate: opticalCableLogs.usageDate,
                logType: opticalCableLogs.logType,
                workerName: opticalCableLogs.workerName,
                projectNameUsage: opticalCableLogs.projectNameUsage,
            })
            .from(opticalCableLogs)
            .where(
                or(
                    like(opticalCableLogs.workerName, 'parkjo%'),
                    like(opticalCableLogs.workerName, 'user%'),
                    like(opticalCableLogs.workerName, 'admin%'),
                    like(opticalCableLogs.workerName, 'epiz%'),
                    like(opticalCableLogs.workerName, 'field%'),
                    like(opticalCableLogs.workerName, 'inventory%'),
                    like(opticalCableLogs.workerName, 'readonly%')
                )
            )
            .orderBy(opticalCableLogs.usageDate);

        console.log(`📦 총 ${records.length}개의 아이디 형식 데이터를 발견했습니다.\n`);

        if (records.length > 0) {
            console.log("📋 발견된 데이터:");
            console.log("=".repeat(80));
            records.forEach(record => {
                console.log(`   ID: ${record.id} | ${record.usageDate} | ${record.logType?.padEnd(10)} | ${record.workerName}`);
            });
            console.log("=".repeat(80));
        } else {
            console.log("✅ 아이디 형식의 workerName이 없습니다. 모두 실명으로 저장되어 있습니다!");
        }

    } catch (error) {
        console.error("❌ 오류 발생:", error);
        process.exit(1);
    }

    process.exit(0);
}

findOpticalUsernameWorkers();
