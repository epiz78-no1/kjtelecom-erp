import "dotenv/config";
import { db } from "../db.js";
import { inventoryItems, incomingRecords, outgoingRecords, materialUsageRecords } from "../../shared/schema.js";
import { eq, and, sql } from "drizzle-orm";

/**
 * 중복된 재고 항목을 병합하는 스크립트
 * 
 * 같은 tenantId, division, productName, specification을 가진 중복 항목을:
 * 1. 가장 오래된 항목(id가 작은 것)을 "올바른 항목"으로 선택
 * 2. 다른 중복 항목들의 재고 수량을 올바른 항목에 합산
 * 3. 중복 항목에 연결된 입고/출고/사용 내역을 올바른 항목으로 변경
 * 4. 중복 항목 삭제
 */

async function mergeDuplicateInventoryItems() {
    console.log("=== 중복 재고 항목 병합 시작 ===\n");

    try {
        // 1. 중복 항목 찾기
        const duplicates = await db.execute(sql`
      SELECT 
        tenant_id,
        TRIM(division) as division,
        TRIM(product_name) as product_name,
        TRIM(specification) as specification,
        COUNT(*) as count,
        ARRAY_AGG(id ORDER BY id) as ids,
        ARRAY_AGG(remaining ORDER BY id) as remainings,
        ARRAY_AGG(outgoing ORDER BY id) as outgoings,
        ARRAY_AGG(incoming ORDER BY id) as incomings,
        ARRAY_AGG(usage ORDER BY id) as usages,
        ARRAY_AGG(carried_over ORDER BY id) as carried_overs
      FROM inventory_items
      GROUP BY tenant_id, TRIM(division), TRIM(product_name), TRIM(specification)
      HAVING COUNT(*) > 1
    `);

        if (duplicates.rows.length === 0) {
            console.log("✅ 중복 항목이 없습니다.");
            return;
        }

        console.log(`⚠️  ${duplicates.rows.length}개의 중복 그룹을 발견했습니다.\n`);

        for (const dup of duplicates.rows as any[]) {
            const ids = dup.ids as number[];
            const keepId = ids[0]; // 가장 오래된 항목 유지
            const removeIds = ids.slice(1); // 나머지 삭제

            console.log(`\n--- 처리 중: ${dup.division} - ${dup.product_name} (${dup.specification}) ---`);
            console.log(`유지할 ID: ${keepId}`);
            console.log(`삭제할 ID: ${removeIds.join(", ")}`);

            // 2. 재고 수량 합산
            const totalRemaining = (dup.remainings as number[]).reduce((sum: number, val: number) => sum + (val || 0), 0);
            const totalOutgoing = (dup.outgoings as number[]).reduce((sum: number, val: number) => sum + (val || 0), 0);
            const totalIncoming = (dup.incomings as number[]).reduce((sum: number, val: number) => sum + (val || 0), 0);
            const totalUsage = (dup.usages as number[]).reduce((sum: number, val: number) => sum + (val || 0), 0);
            const totalCarriedOver = (dup.carried_overs as number[]).reduce((sum: number, val: number) => sum + (val || 0), 0);

            console.log(`합산 재고: remaining=${totalRemaining}, outgoing=${totalOutgoing}, incoming=${totalIncoming}, usage=${totalUsage}, carriedOver=${totalCarriedOver}`);

            // 3. 올바른 항목의 재고 수량 업데이트
            await db.execute(sql`
        UPDATE inventory_items
        SET 
          remaining = ${totalRemaining},
          outgoing = ${totalOutgoing},
          incoming = ${totalIncoming},
          usage = ${totalUsage},
          carried_over = ${totalCarriedOver}
        WHERE id = ${keepId}
      `);

            // 4. 입고 내역 업데이트
            for (const removeId of removeIds) {
                const incomingCount = await db.execute(sql`
          UPDATE incoming_records
          SET inventory_item_id = ${keepId}
          WHERE inventory_item_id = ${removeId}
        `);
                console.log(`  입고 내역 ${incomingCount.rowCount || 0}건 이동`);

                // 5. 출고 내역 업데이트
                const outgoingCount = await db.execute(sql`
          UPDATE outgoing_records
          SET inventory_item_id = ${keepId}
          WHERE inventory_item_id = ${removeId}
        `);
                console.log(`  출고 내역 ${outgoingCount.rowCount || 0}건 이동`);

                // 6. 사용 내역 업데이트
                const usageCount = await db.execute(sql`
          UPDATE material_usage_records
          SET inventory_item_id = ${keepId}
          WHERE inventory_item_id = ${removeId}
        `);
                console.log(`  사용 내역 ${usageCount.rowCount || 0}건 이동`);
            }

            // 7. 중복 항목 삭제
            for (const removeId of removeIds) {
                await db.execute(sql`
          DELETE FROM inventory_items
          WHERE id = ${removeId}
        `);
            }
            console.log(`✅ 중복 항목 ${removeIds.length}개 삭제 완료`);
        }

        console.log("\n=== 병합 완료 ===");
    } catch (error) {
        console.error("❌ 오류 발생:", error);
        throw error;
    }
}

// 실행
mergeDuplicateInventoryItems()
    .then(() => {
        console.log("\n✨ 스크립트 실행 완료");
        process.exit(0);
    })
    .catch((error) => {
        console.error("\n💥 스크립트 실행 실패:", error);
        process.exit(1);
    });
