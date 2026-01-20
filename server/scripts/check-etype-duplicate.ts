import { db } from "../db.js";
import { inventoryItems } from "../../shared/schema.js";
import { like, or } from "drizzle-orm";

async function checkETypeDuplicate() {
    console.log("🔍 E-Type 함체 중복 데이터 조사 중...\n");

    // E-Type 함체 검색
    const items = await db.select().from(inventoryItems).where(
        or(
            like(inventoryItems.productName, '%E-Type%'),
            like(inventoryItems.productName, '%E-type%'),
            like(inventoryItems.productName, '%e-type%'),
            like(inventoryItems.productName, '%함체%')
        )
    );

    console.log(`총 ${items.length}개의 항목 발견:\n`);

    items.forEach((item, index) => {
        console.log(`[${index + 1}] ID: ${item.id}`);
        console.log(`    품명: "${item.productName}" (길이: ${item.productName.length})`);
        console.log(`    규격: "${item.specification}" (길이: ${item.specification.length})`);
        console.log(`    사업: "${item.division}" (길이: ${item.division.length})`);
        console.log(`    재고: ${item.remaining}`);
        console.log(`    단가: ${item.unitPrice}`);
        console.log(`    금액: ${item.totalAmount}`);

        // 공백 체크
        const hasLeadingSpace = item.productName !== item.productName.trimStart();
        const hasTrailingSpace = item.productName !== item.productName.trimEnd();
        const specHasSpace = item.specification !== item.specification.trim();
        const divHasSpace = item.division !== item.division.trim();

        if (hasLeadingSpace || hasTrailingSpace || specHasSpace || divHasSpace) {
            console.log(`    ⚠️  공백 발견!`);
            if (hasLeadingSpace) console.log(`       - 품명 앞 공백`);
            if (hasTrailingSpace) console.log(`       - 품명 뒤 공백`);
            if (specHasSpace) console.log(`       - 규격 공백`);
            if (divHasSpace) console.log(`       - 사업 공백`);
        }
        console.log("");
    });

    // 중복 체크 (trim 후 비교)
    const normalized = items.map(item => ({
        ...item,
        normalizedKey: `${item.productName.trim()}|${item.specification.trim()}|${item.division.trim()}`
    }));

    const duplicates = new Map<string, typeof normalized>();
    normalized.forEach(item => {
        const existing = duplicates.get(item.normalizedKey);
        if (existing) {
            existing.push(item);
        } else {
            duplicates.set(item.normalizedKey, [item]);
        }
    });

    console.log("\n📊 중복 분석:");
    duplicates.forEach((group, key) => {
        if (group.length > 1) {
            console.log(`\n⚠️  중복 발견: "${key}"`);
            console.log(`   총 ${group.length}개 항목:`);
            group.forEach(item => {
                console.log(`   - ID ${item.id}: 재고 ${item.remaining}`);
            });
        }
    });

    process.exit(0);
}

checkETypeDuplicate().catch(console.error);
