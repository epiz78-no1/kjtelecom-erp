import "dotenv/config";
import { db } from "../db.js";
import { sql } from "drizzle-orm";

/**
 * 광케이블 로그 테이블에 projectCode와 attributes 컬럼 추가
 */

async function addProjectCodeToOpticalLogs() {
    console.log("광케이블 로그 테이블에 projectCode와 attributes 컬럼 추가 시작...");

    try {
        // projectCode 컬럼 추가
        await db.execute(sql`
            ALTER TABLE optical_cable_logs 
            ADD COLUMN IF NOT EXISTS project_code TEXT
        `);
        console.log("✓ project_code 컬럼 추가 완료");

        // attributes 컬럼 추가
        await db.execute(sql`
            ALTER TABLE optical_cable_logs 
            ADD COLUMN IF NOT EXISTS attributes TEXT
        `);
        console.log("✓ attributes 컬럼 추가 완료");

        console.log("\n마이그레이션 완료!");
    } catch (error) {
        console.error("마이그레이션 중 오류 발생:", error);
        throw error;
    }
}

// 스크립트 실행
addProjectCodeToOpticalLogs()
    .then(() => {
        console.log("스크립트 실행 완료");
        process.exit(0);
    })
    .catch((error) => {
        console.error("스크립트 실행 실패:", error);
        process.exit(1);
    });
