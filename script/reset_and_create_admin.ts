import "dotenv/config";
import { db } from "../server/db";
import { users, tenants, userTenants } from "../shared/schema";
import bcrypt from "bcryptjs";

const SALT_ROUNDS = 10;

async function resetAndCreateSuperAdmin() {
    console.log("🧹 Cleaning up existing data...");

    if (!process.env.DATABASE_URL) {
        console.error("❌ DATABASE_URL is missing.");
        process.exit(1);
    }

    // 1. Delete all existing data
    await db.delete(userTenants);
    await db.delete(users);
    await db.delete(tenants);
    console.log("✅ Deleted all existing users, tenants, and links");

    // 2. Create SuperAdmin User (NOT linked to any tenant)
    const username = "admin";
    const password = "admin";
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    const [superAdmin] = await db.insert(users).values({
        username,
        password: hashedPassword,
        name: "슈퍼관리자"
    }).returning();

    console.log(`✅ Created SuperAdmin: ${username}`);
    console.log("ℹ️  SuperAdmin is NOT linked to any tenant (as designed)");

    console.log("\n✨ Setup completed successfully!");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("📋 SuperAdmin Account:");
    console.log(`   Username: ${username}`);
    console.log(`   Password: ${password}`);
    console.log(`   Name: 슈퍼관리자`);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("\n🎯 SuperAdmin 권한:");
    console.log("   ✓ 회사(Tenant) 생성/수정/삭제");
    console.log("   ✓ 각 회사의 관리자 계정 생성/삭제");
    console.log("   ✓ 전체 시스템 관리");
    console.log("\n📌 SuperAdmin은 특정 조직에 속하지 않습니다.");
    console.log("   로그인 후 /super-admin 페이지에서 회사와 관리자를 관리할 수 있습니다.");

    process.exit(0);
}

resetAndCreateSuperAdmin().catch(e => {
    console.error(e);
    process.exit(1);
});
