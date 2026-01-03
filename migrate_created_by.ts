import { db } from "./server/db";
import { sql } from "drizzle-orm";

async function main() {
    console.log("입력자 정보 필드 추가 마이그레이션 시작...");

    try {
        // 1. inventory_items 테이블
        await db.execute(sql`
      ALTER TABLE inventory_items 
      ADD COLUMN IF NOT EXISTS created_by VARCHAR REFERENCES users(id)
    `);
        console.log("✓ inventory_items 테이블 업데이트 완료");

        // 2. incoming_records 테이블
        await db.execute(sql`
      ALTER TABLE incoming_records 
      ADD COLUMN IF NOT EXISTS created_by VARCHAR REFERENCES users(id)
    `);
        console.log("✓ incoming_records 테이블 업데이트 완료");

        // 3. outgoing_records 테이블
        await db.execute(sql`
      ALTER TABLE outgoing_records 
      ADD COLUMN IF NOT EXISTS created_by VARCHAR REFERENCES users(id)
    `);
        console.log("✓ outgoing_records 테이블 업데이트 완료");

        // 4. material_usage_records 테이블
        await db.execute(sql`
      ALTER TABLE material_usage_records 
      ADD COLUMN IF NOT EXISTS created_by VARCHAR REFERENCES users(id)
    `);
        console.log("✓ material_usage_records 테이블 업데이트 완료");

        // 5. optical_cables 테이블
        await db.execute(sql`
      ALTER TABLE optical_cables 
      ADD COLUMN IF NOT EXISTS created_by VARCHAR REFERENCES users(id)
    `);
        console.log("✓ optical_cables 테이블 업데이트 완료");

        // 6. optical_cable_logs 테이블
        await db.execute(sql`
      ALTER TABLE optical_cable_logs 
      ADD COLUMN IF NOT EXISTS created_by VARCHAR REFERENCES users(id)
    `);
        console.log("✓ optical_cable_logs 테이블 업데이트 완료");

        console.log("\n✅ 모든 테이블 마이그레이션 완료!");
    } catch (error) {
        console.error("❌ 마이그레이션 실패:", error);
    }

    process.exit(0);
}

main();
