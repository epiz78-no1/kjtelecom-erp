import { db } from "./server/db";
import { demolitionMaterials, tenants } from "./shared/schema";
import { eq } from "drizzle-orm";

async function checkDemolitionData() {
    try {
        console.log("🔍 운영 DB 철거자재 데이터 확인 중...\n");

        // 모든 테넌트 조회
        const allTenants = await db.select().from(tenants);
        console.log(`📊 전체 테넌트 수: ${allTenants.length}`);
        allTenants.forEach(t => {
            console.log(`  - ${t.name} (ID: ${t.id})`);
        });
        console.log("");

        // 모든 철거자재 데이터 조회
        const allDemolitionMaterials = await db.select().from(demolitionMaterials);
        console.log(`📦 전체 철거자재 데이터 수: ${allDemolitionMaterials.length}\n`);

        if (allDemolitionMaterials.length === 0) {
            console.log("⚠️  철거자재 데이터가 없습니다!");
            return;
        }

        // 테넌트별로 그룹화
        const byTenant = allDemolitionMaterials.reduce((acc, item) => {
            const tenantId = item.tenantId;
            if (!acc[tenantId]) {
                acc[tenantId] = [];
            }
            acc[tenantId].push(item);
            return acc;
        }, {} as Record<string, typeof allDemolitionMaterials>);

        // 테넌트별 데이터 출력
        for (const [tenantId, items] of Object.entries(byTenant)) {
            const tenant = allTenants.find(t => t.id === tenantId);
            console.log(`\n📋 ${tenant?.name || '알 수 없는 테넌트'} (${tenantId}):`);
            console.log(`   총 ${items.length}개 항목`);

            items.forEach((item, idx) => {
                console.log(`   ${idx + 1}. ${item.productName} - ${item.specification || '규격 없음'}`);
                console.log(`      수량: ${item.remaining}, 금액: ₩${item.totalAmount?.toLocaleString() || 0}`);
                console.log(`      등록일: ${item.registrationDate}`);
            });
        }

    } catch (error) {
        console.error("❌ 오류 발생:", error);
    } finally {
        process.exit(0);
    }
}

checkDemolitionData();
