
import { storage } from "../server/storage";
import { db } from "../server/db";

async function main() {
    // We need a tenantId. From previous debug_db, we saw users but not tenants.
    // Let's just pick the first tenant found.
    const tenants = await db.query.tenants.findMany();
    if (tenants.length === 0) {
        console.log("No tenants found");
        return;
    }
    const tenantId = tenants[0].id;
    console.log(`Debugging getMembers for tenant: ${tenantId}`);

    const members = await storage.getMembers(tenantId);
    console.log(JSON.stringify(members, null, 2));
    process.exit(0);
}

main().catch(console.error);
