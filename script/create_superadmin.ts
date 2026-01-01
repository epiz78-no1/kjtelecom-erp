import "dotenv/config";
import { db } from "../server/db";
import { users, tenants, userTenants } from "../shared/schema";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";

const SALT_ROUNDS = 10;

async function createSuperAdmin() {
    console.log("🚀 Creating superadmin account...");

    if (!process.env.DATABASE_URL) {
        console.error("❌ DATABASE_URL is missing.");
        process.exit(1);
    }

    // 1. Create Default Tenant if not exists
    const tenantSlug = "default";
    const tenantName = "기본 조직";

    let [tenant] = await db.select().from(tenants).where(eq(tenants.slug, tenantSlug));

    if (!tenant) {
        [tenant] = await db.insert(tenants).values({
            name: tenantName,
            slug: tenantSlug,
            isActive: true
        }).returning();
        console.log(`✅ Created Tenant: ${tenantName}`);
    } else {
        console.log(`ℹ️ Tenant already exists: ${tenantName}`);
    }

    // 2. Create SuperAdmin User
    const username = "admin";
    const password = "chldhrwn7908?";
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    let [user] = await db.select().from(users).where(eq(users.username, username));

    if (!user) {
        [user] = await db.insert(users).values({
            username,
            password: hashedPassword,
            name: "슈퍼관리자"
        }).returning();
        console.log(`✅ Created SuperAdmin: ${username}`);
    } else {
        await db.update(users).set({
            password: hashedPassword,
            name: "슈퍼관리자"
        }).where(eq(users.id, user.id));
        console.log(`ℹ️ SuperAdmin updated: ${username}`);
    }

    // 3. Link User to Tenant as Admin
    const [existingLink] = await db.select().from(userTenants).where(
        eq(userTenants.userId, user.id)
    );

    if (!existingLink) {
        await db.insert(userTenants).values({
            userId: user.id,
            tenantId: tenant.id,
            role: "admin",
            status: "active"
        });
        console.log(`🔗 Linked user ${username} to ${tenantName}`);
    } else {
        console.log(`ℹ️ User already linked to a tenant.`);
    }

    console.log("\n✨ SuperAdmin created successfully!");
    console.log(`📋 Username: ${username}`);
    console.log(`🔑 Password: ${password}`);
    console.log(`👤 Name: 슈퍼관리자`);
    console.log(`🏢 Organization: ${tenantName}`);

    process.exit(0);
}

createSuperAdmin().catch(e => {
    console.error(e);
    process.exit(1);
});
