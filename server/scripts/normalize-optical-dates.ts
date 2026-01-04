import "dotenv/config";
import { db } from "../db.js";
import { opticalCables } from "../../shared/schema.js";
import { eq } from "drizzle-orm";

/**
 * 광케이블 데이터의 receivedDate 형식을 YYYY-MM-DD로 표준화하는 스크립트
 * 예: 2025-1-2 -> 2025-01-02
 */

async function normalizeOpticalCableDates() {
    console.log("광케이블 날짜 형식 표준화 시작...");

    try {
        // 모든 광케이블 데이터 조회
        const cables = await db.select().from(opticalCables);

        console.log(`총 ${cables.length}개의 광케이블 데이터를 확인합니다.`);

        let updatedCount = 0;

        for (const cable of cables) {
            if (!cable.receivedDate) continue;

            const originalDate = cable.receivedDate;

            // 이미 YYYY-MM-DD 형식인지 확인
            if (/^\d{4}-\d{2}-\d{2}$/.test(originalDate)) {
                continue;
            }

            // YYYY-M-D 또는 YYYY.M.D 형식을 YYYY-MM-DD로 변환
            const parts = originalDate.split(/[-.]/);
            if (parts.length === 3) {
                const year = parts[0].padStart(4, '0');
                const month = parts[1].padStart(2, '0');
                const day = parts[2].padStart(2, '0');
                const normalizedDate = `${year}-${month}-${day}`;

                // 데이터베이스 업데이트
                await db
                    .update(opticalCables)
                    .set({ receivedDate: normalizedDate })
                    .where(eq(opticalCables.id, cable.id));

                console.log(`✓ ID ${cable.id}: ${originalDate} -> ${normalizedDate}`);
                updatedCount++;
            } else {
                console.warn(`⚠ ID ${cable.id}: 잘못된 날짜 형식 - ${originalDate}`);
            }
        }

        console.log(`\n완료! ${updatedCount}개의 날짜가 표준화되었습니다.`);
    } catch (error) {
        console.error("날짜 표준화 중 오류 발생:", error);
        throw error;
    }
}

// 스크립트 실행
normalizeOpticalCableDates()
    .then(() => {
        console.log("스크립트 실행 완료");
        process.exit(0);
    })
    .catch((error) => {
        console.error("스크립트 실행 실패:", error);
        process.exit(1);
    });
