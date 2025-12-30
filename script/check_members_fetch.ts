
import { storage } from "../server/storage";
import { db } from "../server/db";
import { users } from "../shared/schema";
import { eq } from "drizzle-orm";

async function main() {
    const targetUsername = "user1";
    console.log(`Checking members fetch for tenant of user: ${targetUsername}`);

    const user = await db.query.users.findFirst({
        where: eq(users.username, targetUsername)
    });

    if (!user) {
        console.error("User not found!");
        process.exit(1);
    }

    // Find tenant ID for this user
    const userTenant = await db.query.userTenants.findFirst({
        where: (ut, { eq }) => eq(ut.userId, user.id)
    });

    if (!userTenant) {
        console.error("User has no tenant");
        process.exit(1);
    }

    const tenantId = userTenant.tenantId;
    console.log(`Tenant ID: ${tenantId}`);

    // Simulate getMembers
    const members = await storage.getMembers(tenantId);
    console.log(`Found ${members.length} members`);

    const user1Member = members.find(m => m.username === targetUsername);
    console.log("User1 Member Record:", user1Member);

    if (user1Member) {
        console.log(`User1 TeamID: ${user1Member.teamId}`);
    }

    process.exit(0);
}

main().catch(console.error);
