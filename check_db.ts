
import { db } from "./server/db";
import { users, tenants, userTenants } from "./shared/schema";

async function check() {
    console.log("--- Users ---");
    const allUsers = await db.select().from(users);
    console.table(allUsers.map(u => ({ id: u.id, email: u.email, name: u.name })));

    console.log("\n--- Tenants ---");
    const allTenants = await db.select().from(tenants);
    console.table(allTenants.map(t => ({ id: t.id, name: t.name, slug: t.slug })));

    console.log("\n--- UserTenants ---");
    const allUserTenants = await db.select().from(userTenants);
    console.table(allUserTenants);
}

check().catch(console.error);
