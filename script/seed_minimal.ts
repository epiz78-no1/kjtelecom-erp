
import { db } from "../server/db";
import { users, tenants, userTenants, divisions, teams, positions, inventoryItems, incomingRecords, outgoingRecords, materialUsageRecords } from "../shared/schema";
import bcrypt from "bcrypt";
import { eq, and } from "drizzle-orm";
import { randomUUID } from "crypto";

import { migrate } from "drizzle-orm/pglite/migrator";

const SALT_ROUNDS = 10;

async function seed() {
    console.log("🌱 Starting MINIMAL database seeding (Tenants & Users only)...");

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
            console.log(`ℹ️ User ${u.username} exists, updating info.`);
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
            }
        }
    }

    console.log("🏁 Minimal Seeding completed (Tenants & Users only)!");
    process.exit(0);
}

seed().catch(err => {
    console.error("❌ Seeding failed:", err);
    process.exit(1);
});
