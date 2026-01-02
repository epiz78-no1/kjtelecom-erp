
import { db } from "./server/db";
import { users, userTenants, tenants } from "./shared/schema";
import { eq } from "drizzle-orm";

async function debugMembers() {
    console.log("🔍 Debugging Tenant Members...");

    const allTenants = await db.select().from(tenants);

    for (const t of allTenants) {
        console.log(`\n🏢 Tenant: ${t.name} (${t.slug})`);

        const members = await db.select({
            username: users.username,
            name: users.name,
            role: userTenants.role
        })
            .from(userTenants)
            .innerJoin(users, eq(userTenants.userId, users.id))
            .where(eq(userTenants.tenantId, t.id));

        if (members.length === 0) {
            console.log("   (No members found)");
        } else {
            members.forEach(m => {
                console.log(`   - [${m.role}] ${m.name} (${m.username})`);
            });
        }
    }
    process.exit(0);
}

debugMembers().catch(console.error);
