import { db } from "../server/db";
import { users, tenants, userTenants, divisions, teams, positions, inventoryItems, incomingRecords, outgoingRecords, materialUsageRecords } from "../shared/schema";
import bcrypt from "bcrypt";
import { eq, and } from "drizzle-orm";
import { randomUUID } from "crypto";

import { migrate } from "drizzle-orm/pglite/migrator";

const SALT_ROUNDS = 10;

async function seed() {
    console.log("🌱 Starting database seeding...");

    // Run migrations
    console.log("📦 Running migrations...");
    await migrate(db, { migrationsFolder: "./migrations" });
    console.log("✅ Migrations completed");

    const password = "admin"; // Fallback
    const testPassword = "123456";
    const testHashedPassword = await bcrypt.hash(testPassword, SALT_ROUNDS);
    const adminHashedPassword = await bcrypt.hash("admin", SALT_ROUNDS);

    // 1. Create Tenants
    const tenantData = [
        { name: "광텔", slug: "gwangtel" },
        { name: "한주통신", slug: "hanju" }
    ];

    const createdTenants = [];
    for (const t of tenantData) {
        let tenant = await db.query.tenants.findFirst({
            where: eq(tenants.slug, t.slug)
        });

        if (!tenant) {
            [tenant] = await db.insert(tenants).values({
                name: t.name,
                slug: t.slug,
                isActive: true
            }).returning();
            console.log(`✅ Created tenant: ${t.name}`);
        } else {
            console.log(`ℹ️ Tenant ${t.name} already exists.`);
        }
        createdTenants.push(tenant);
    }

    const gwangtel = createdTenants.find(t => t.slug === "gwangtel");
    const hanju = createdTenants.find(t => t.slug === "hanju");

    // 2. Create Users
    const userData = [
        { username: "admin", name: "최고관리자", password: "admin", tenants: [gwangtel, hanju], role: "admin" },
        { username: "admin1", name: "광텔관리자", password: "123456", tenants: [gwangtel], role: "admin" },
        { username: "admin2", name: "한주관리자", password: "123456", tenants: [hanju], role: "admin" },
        {
            username: "inventory01", name: "재고담당자", password: "123456", tenants: [gwangtel], role: "member",
            permissions: { incoming: "write", outgoing: "write", usage: "read", inventory: "write" }
        },
        {
            username: "field01", name: "현장작업자", password: "123456", tenants: [gwangtel], role: "member",
            permissions: { incoming: "none", outgoing: "own_only", usage: "own_only", inventory: "read" }
        },
        {
            username: "readonly01", name: "조회담당자", password: "123456", tenants: [gwangtel], role: "member",
            permissions: { incoming: "read", outgoing: "read", usage: "read", inventory: "read" }
        },
        { username: "user1", name: "광텔 사용자", password: "123456", tenants: [gwangtel], role: "member" },
        { username: "user2", name: "한주 사용자", password: "123456", tenants: [hanju], role: "member" }
    ];

    for (const u of userData) {
        let user = await db.query.users.findFirst({
            where: eq(users.username, u.username)
        });

        const userHash = u.password === "admin" ? adminHashedPassword : testHashedPassword;

        if (!user) {
            [user] = await db.insert(users).values({
                username: u.username,
                password: userHash,
                name: u.name
            }).returning();
            console.log(`✅ Created user: ${u.username}`);
        } else {
            await db.update(users).set({ password: userHash, name: u.name }).where(eq(users.id, user.id));
            console.log(`ℹ️ User ${u.username} already exists, updated password.`);
        }

        const targetTenants = (u as any).tenants || [];

        for (const tenant of targetTenants) {
            const existingRelation = await db.query.userTenants.findFirst({
                where: and(eq(userTenants.userId, user!.id), eq(userTenants.tenantId, tenant.id))
            });

            if (!existingRelation) {
                await db.insert(userTenants).values({
                    userId: user!.id,
                    tenantId: tenant.id,
                    role: u.role as "admin" | "member" | "owner",
                    permissions: (u as any).permissions,
                    status: "active"
                });
                console.log(`🔗 Linked ${u.username} to ${tenant.name} as ${u.role}`);
            } else {
                await db.update(userTenants).set({
                    role: u.role as "admin" | "member" | "owner",
                    permissions: (u as any).permissions
                }).where(eq(userTenants.id, existingRelation.id));
            }
        }
    }

    // 3. Setup Organization Structure for each Tenant
    for (const tenant of createdTenants) {
        console.log(`🏢 Setting up structure for ${tenant.name}...`);

        const positionData = [
            { name: "대표이사", rankOrder: 1 },
            { name: "본부장", rankOrder: 2 },
            { name: "팀장", rankOrder: 3 },
            { name: "대리", rankOrder: 4 },
            { name: "사원", rankOrder: 5 }
        ];

        for (const p of positionData) {
            const existing = await db.query.positions.findFirst({
                where: and(eq(positions.name, p.name), eq(positions.tenantId, tenant.id))
            });
            if (!existing) {
                await db.insert(positions).values({
                    id: randomUUID(),
                    tenantId: tenant.id,
                    name: p.name,
                    rankOrder: p.rankOrder
                });
            }
        }

        const devDivId = `div-dev-${tenant.id}`;
        const salesDivId = `div-sales-${tenant.id}`;

        const divData = [
            { id: devDivId, name: "기술국" },
            { id: salesDivId, name: "영업국" }
        ];

        for (const d of divData) {
            const existing = await db.query.divisions.findFirst({
                where: and(eq(divisions.name, d.name), eq(divisions.tenantId, tenant.id))
            });
            if (!existing) {
                await db.insert(divisions).values({
                    id: d.id,
                    tenantId: tenant.id,
                    name: d.name
                });
                console.log(`  ✅ Created division: ${d.name}`);

                const teamNames = d.name === "기술국" ? ["개통팀", "A/S팀"] : ["특판팀", "일반영업팀"];
                for (const teamName of teamNames) {
                    await db.insert(teams).values({
                        id: randomUUID(),
                        tenantId: tenant.id,
                        divisionId: d.id,
                        name: teamName
                    });
                    console.log(`    ✅ Created team: ${teamName}`);
                }
            }
        }
    }

    // 4. Add Sample Inventory Items (Different for each company)
    console.log("📦 Adding sample inventory items...");

    const gwangtelInventory = [
        { category: "케이블", productName: "광케이블", specification: "8C SM", division: "SKT", unitPrice: 15000 },
        { category: "케이블", productName: "광케이블", specification: "24C SM", division: "KT", unitPrice: 35000 },
        { category: "단자함", productName: "광단자함", specification: "8구", division: "SKT", unitPrice: 45000 },
        { category: "광커넥터", productName: "SC커넥터", specification: "SM", division: "SKT", unitPrice: 1500 },
        { category: "공구", productName: "광파이버클리버", specification: "정밀형", division: "SKT", unitPrice: 180000 },
        { category: "측정기", productName: "광파워미터", specification: "디지털", division: "SKT", unitPrice: 350000 },
        { category: "보호재", productName: "열수축튜브", specification: "60mm", division: "LG", unitPrice: 500 },
    ];

    const hanjuInventory = [
        { category: "케이블", productName: "동축케이블", specification: "RG-6", division: "LG", unitPrice: 8000 },
        { category: "단자함", productName: "광단자함", specification: "16구", division: "KT", unitPrice: 65000 },
        { category: "광커넥터", productName: "LC커넥터", specification: "SM", division: "KT", unitPrice: 2000 },
        { category: "공구", productName: "스트리퍼", specification: "다용도", division: "KT", unitPrice: 25000 },
        { category: "보호재", productName: "PVC테이프", specification: "19mm", division: "SKT", unitPrice: 1200 },
        { category: "케이블", productName: "UTP케이블", specification: "CAT6", division: "KT", unitPrice: 12000 },
        { category: "단자함", productName: "멀티탭", specification: "8구", division: "LG", unitPrice: 15000 },
    ];

    for (const tenant of createdTenants) {
        const inventoryData = tenant.slug === "gwangtel" ? gwangtelInventory : hanjuInventory;

        for (const item of inventoryData) {
            const existing = await db.query.inventoryItems.findFirst({
                where: and(
                    eq(inventoryItems.tenantId, tenant.id),
                    eq(inventoryItems.productName, item.productName),
                    eq(inventoryItems.specification, item.specification)
                )
            });

            if (!existing) {
                const carriedOver = Math.floor(Math.random() * 50) + 10;
                const incoming = Math.floor(Math.random() * 100) + 20;
                const outgoing = Math.floor(Math.random() * 30) + 5;
                const remaining = carriedOver + incoming - outgoing;

                await db.insert(inventoryItems).values({
                    tenantId: tenant.id,
                    division: item.division,
                    category: item.category,
                    productName: item.productName,
                    specification: item.specification,
                    carriedOver,
                    incoming,
                    outgoing,
                    remaining,
                    unitPrice: item.unitPrice,
                    totalAmount: remaining * item.unitPrice
                });
            }
        }
        console.log(`  ✅ Added ${inventoryData.length} inventory items for ${tenant.name}`);
    }

    // 5. Add Sample Incoming Records (Different suppliers per company)
    console.log("📥 Adding sample incoming records...");
    const gwangtelSuppliers = ["한국광통신", "서울케이블", "대한자재"];
    const hanjuSuppliers = ["광명통신자재", "부산케이블", "경기통신"];
    const today = new Date();

    for (const tenant of createdTenants) {
        const inventoryData = tenant.slug === "gwangtel" ? gwangtelInventory : hanjuInventory;
        const suppliers = tenant.slug === "gwangtel" ? gwangtelSuppliers : hanjuSuppliers;

        for (let i = 0; i < 8; i++) {
            const daysAgo = Math.floor(Math.random() * 30);
            const date = new Date(today);
            date.setDate(date.getDate() - daysAgo);
            const dateStr = date.toISOString().split('T')[0];

            const item = inventoryData[Math.floor(Math.random() * inventoryData.length)];
            const supplier = suppliers[Math.floor(Math.random() * suppliers.length)];
            const quantity = Math.floor(Math.random() * 50) + 10;

            await db.insert(incomingRecords).values({
                tenantId: tenant.id,
                date: dateStr,
                division: item.division,
                supplier,
                projectName: `${tenant.name} ${dateStr.substring(5)} 입고`,
                productName: item.productName,
                specification: item.specification,
                quantity,
                unitPrice: item.unitPrice
            });
        }
        console.log(`  ✅ Added incoming records for ${tenant.name}`);
    }

    // 6. Add Sample Outgoing Records (Different recipients per company)
    console.log("📤 Adding sample outgoing records...");
    const teamCategories = ["개통팀", "A/S팀", "특판팀", "일반영업팀"];
    const gwangtelRecipients = ["김철수", "이영희", "박민수"];
    const hanjuRecipients = ["정수진", "최동욱", "강민호"];

    for (const tenant of createdTenants) {
        const inventoryData = tenant.slug === "gwangtel" ? gwangtelInventory : hanjuInventory;
        const recipients = tenant.slug === "gwangtel" ? gwangtelRecipients : hanjuRecipients;

        for (let i = 0; i < 12; i++) {
            const daysAgo = Math.floor(Math.random() * 30);
            const date = new Date(today);
            date.setDate(date.getDate() - daysAgo);
            const dateStr = date.toISOString().split('T')[0];

            const item = inventoryData[Math.floor(Math.random() * inventoryData.length)];
            const teamCategory = teamCategories[Math.floor(Math.random() * teamCategories.length)];
            const recipient = recipients[Math.floor(Math.random() * recipients.length)];
            const quantity = Math.floor(Math.random() * 20) + 1;

            await db.insert(outgoingRecords).values({
                tenantId: tenant.id,
                date: dateStr,
                division: item.division,
                teamCategory,
                projectName: `${tenant.name}-${dateStr.substring(5)}-${i + 1}`,
                productName: item.productName,
                specification: item.specification,
                quantity,
                recipient
            });
        }
        console.log(`  ✅ Added outgoing records for ${tenant.name}`);
    }

    // 7. Add Sample Material Usage Records
    console.log("🔧 Adding sample material usage records...");

    for (const tenant of createdTenants) {
        const inventoryData = tenant.slug === "gwangtel" ? gwangtelInventory : hanjuInventory;
        const recipients = tenant.slug === "gwangtel" ? gwangtelRecipients : hanjuRecipients;

        for (let i = 0; i < 6; i++) {
            const daysAgo = Math.floor(Math.random() * 30);
            const date = new Date(today);
            date.setDate(date.getDate() - daysAgo);
            const dateStr = date.toISOString().split('T')[0];

            const item = inventoryData[Math.floor(Math.random() * inventoryData.length)];
            const teamCategory = teamCategories[Math.floor(Math.random() * teamCategories.length)];
            const recipient = recipients[Math.floor(Math.random() * recipients.length)];
            const quantity = Math.floor(Math.random() * 10) + 1;

            await db.insert(materialUsageRecords).values({
                tenantId: tenant.id,
                date: dateStr,
                division: item.division,
                teamCategory,
                projectName: `${tenant.name} 현장작업-${dateStr.substring(5)}`,
                productName: item.productName,
                specification: item.specification,
                quantity,
                recipient
            });
        }
        console.log(`  ✅ Added material usage records for ${tenant.name}`);
    }

    console.log("🏁 Seeding completed!");
    process.exit(0);
}

seed().catch(err => {
    console.error("❌ Seeding failed:", err);
    process.exit(1);
});
