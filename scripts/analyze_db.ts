
import * as dotenv from "dotenv";
dotenv.config();
import { db } from "../server/db";
import { inventoryItems, incomingRecords, outgoingRecords } from "../shared/schema";
import { lt, sql, eq, and } from "drizzle-orm";

async function analyze() {
  console.log("=== 1. 음수 데이터 검색 (Inventory Items) ===");
  const negativeItems = await db.select().from(inventoryItems).where(
    sql`${inventoryItems.incoming} < 0 OR ${inventoryItems.remaining} < 0 OR ${inventoryItems.carriedOver} < 0`
  );

  if (negativeItems.length === 0) {
    console.log(">> 음수 값을 가진 재고 항목이 없습니다.");
  } else {
    negativeItems.forEach(item => {
      console.log(`[발견] ID: ${item.id} | 품명: ${item.productName} (${item.specification})`);
      console.log(`      이월: ${item.carriedOver}, 입고: ${item.incoming}, 잔여: ${item.remaining}`);
    });
  }

  console.log("\n=== 2. 데이터 무결성 검증 (Calculation Check) ===");
  const allItems = await db.select().from(inventoryItems);

  if (allItems.length === 0) {
    console.log(">> 재고 항목이 없습니다.");
  }

  for (const item of allItems) {
    // 1. 입고 내역 합계 (specification이 null일 수 있으므로 처리)
    const incomingWhere = and(
      eq(incomingRecords.productName, item.productName),
      item.specification
        ? eq(incomingRecords.specification, item.specification)
        : sql`${incomingRecords.specification} IS NULL OR ${incomingRecords.specification} = ''`,
      eq(incomingRecords.division, item.division)
    );

    const incomingExact = await db.select({ total: sql<number>`sum(${incomingRecords.quantity})` })
      .from(incomingRecords)
      .where(incomingWhere);

    // 2. 출고 내역 합계
    const outgoingWhere = and(
      eq(outgoingRecords.productName, item.productName),
      item.specification
        ? eq(outgoingRecords.specification, item.specification)
        : sql`${outgoingRecords.specification} IS NULL OR ${outgoingRecords.specification} = ''`,
      eq(outgoingRecords.division, item.division)
    );

    const outgoingExact = await db.select({ total: sql<number>`sum(${outgoingRecords.quantity})` })
      .from(outgoingRecords)
      .where(outgoingWhere);

    const calcIncoming = Number(incomingExact[0]?.total || 0);
    const calcOutgoing = Number(outgoingExact[0]?.total || 0);
    const calcRemaining = (item.carriedOver || 0) + calcIncoming - calcOutgoing;

    if (item.remaining !== calcRemaining || item.incoming !== calcIncoming) {
      console.log(`[불일치] ${item.productName} (${item.specification})`);
      console.log(`      DB값   -> 입고: ${item.incoming}, 잔여: ${item.remaining}`);
      console.log(`      계산값 -> 입고: ${calcIncoming}, 잔여: ${calcRemaining} (이월: ${item.carriedOver} + 입: ${calcIncoming} - 출: ${calcOutgoing})`);
    }
  }

  console.log("\n[분석 완료]");
  process.exit(0);
}

analyze();
