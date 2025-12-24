import { db } from "./server/db";
import { users, tenants, userTenants } from "./shared/schema";
import bcrypt from "bcrypt";
import { eq } from "drizzle-orm";

const SALT_ROUNDS = 10;

async function setupTestData() {
    console.log("Starting test data setup...");

    const password = "123456";
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    // 1. Create Tenants
    const tenantData = [
        { name: "광텔", slug: "gwangtel" },
        { name: "한주", slug: "hanju" }
    ];

    const createdTenants = [];
    for (const t of tenantData) {
        // Check if tenant exists
        const existing = await db.query.tenants.findFirst({
            where: eq(tenants.slug, t.slug)
        });

        if (existing) {
            console.log(`Tenant ${t.name} already exists.`);
            createdTenants.push(existing);
        } else {
            const [newTenant] = await db.insert(tenants).values({
                name: t.name,
                slug: t.slug,
                isActive: true
            }).returning();
            console.log(`Created tenant: ${t.name}`);
            createdTenants.push(newTenant);
        }
    }

    const gwangtel = createdTenants.find(t => t.slug === "gwangtel")!;
    const hanju = createdTenants.find(t => t.slug === "hanju")!;

    // 2. Create Users
    const userData = [
        { username: "admin1", name: "광텔 관리자", tenant: gwangtel, role: "admin" },
        { username: "test01", name: "광텔 일반", tenant: gwangtel, role: "member" },
        { username: "admin2", name: "한주 관리자", tenant: hanju, role: "admin" },
        { username: "test02", name: "한주 일반", tenant: hanju, role: "member" }
    ];

    for (const u of userData) {
        // Check if user exists
        const existingUser = await db.query.users.findFirst({
            where: eq(users.username, u.username)
        });

        let userId;
        if (existingUser) {
            console.log(`User ${u.username} already exists.`);
            userId = existingUser.id;
        } else {
            const [newUser] = await db.insert(users).values({
                username: u.username,
                password: hashedPassword,
                name: u.name
            }).returning();
            console.log(`Created user: ${u.username}`);
            userId = newUser.id;
        }

        // Check if user-tenant relation exists
        const existingRelation = await db.query.userTenants.findFirst({
            where: (ut, { and, eq }) => and(eq(ut.userId, userId), eq(ut.tenantId, u.tenant.id))
        });

        if (!existingRelation) {
            await db.insert(userTenants).values({
                userId: userId,
                tenantId: u.tenant.id,
                role: u.role
            });
            console.log(`Linked ${u.username} to ${u.tenant.name} as ${u.role}`);
        } else {
            console.log(`${u.username} is already linked to ${u.tenant.name}`);
        }
    }

    console.log("Test data setup completed successfully!");
    process.exit(0);
}

setupTestData().catch(err => {
    console.error("Error setting up test data:", err);
    process.exit(1);
});
