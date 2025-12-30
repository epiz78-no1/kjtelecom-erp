
import { db } from "../server/db";
import { users, tenants } from "../shared/schema";
import { sql } from "drizzle-orm";

async function check() {
    console.log("🔍 Checking database state...");

    // Check Tenants
    const tenantCount = await db.select({ count: sql<number>`count(*)` }).from(tenants);
    console.log(`🏢 Tenants count: ${tenantCount[0].count}`);

    // Check Users
    const userCount = await db.select({ count: sql<number>`count(*)` }).from(users);
    console.log(`👤 Users count: ${userCount[0].count}`);

    if (tenantCount[0].count == 0 || userCount[0].count == 0) {
        console.log("❌ Database appears empty.");
    } else {
        console.log("✅ Database has data.");
        // List users
        const allUsers = await db.select().from(users);
        console.log("Users:", allUsers.map(u => u.username).join(", "));
    }

    process.exit(0);
}

check().catch(err => {
    console.error("❌ Check failed:", err);
    process.exit(1);
});
