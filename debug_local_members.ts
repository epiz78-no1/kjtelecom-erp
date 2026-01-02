
import { db } from "./server/db.js";
import { users, userTenants, tenants } from "./shared/schema.js";
import { eq, sql } from "drizzle-orm";

async function main() {
    console.log("=== Debugging Local Database Members ===");

    // 1. List all Tenants
    const allTenants = await db.select().from(tenants);
    console.log(`Found ${allTenants.length} tenants:`);
    console.table(allTenants.map(t => ({ id: t.id, name: t.name, slug: t.slug })));

    // 2. List all Users
    const allUsers = await db.select().from(users);
    console.log(`\nFound ${allUsers.length} users:`);
    console.table(allUsers.map(u => ({ id: u.id, username: u.username, role: u.role })));

    // 3. List User-Tenant Links
    const links = await db.select({
        username: users.username,
        tenantName: tenants.name,
        role: userTenants.role
    })
        .from(userTenants)
        .leftJoin(users, eq(userTenants.userId, users.id))
        .leftJoin(tenants, eq(userTenants.tenantId, tenants.id));

    console.log(`\nFound ${links.length} member links:`);
    if (links.length > 0) {
        console.table(links);
    } else {
        console.log("No member links found!");
    }

    console.log("\nDone.");
    process.exit(0);
}

main().catch(console.error);
