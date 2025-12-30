
import { db } from "../server/db";
import { users, userTenants, teams } from "../shared/schema";
import { eq } from "drizzle-orm";

async function main() {
    const targetUsername = "user1";
    console.log(`Checking data for user: ${targetUsername}`);

    const user = await db.query.users.findFirst({
        where: eq(users.username, targetUsername)
    });

    if (!user) {
        console.error("User not found!");
        process.exit(1);
    }

    console.log("User found:", user.id, user.name);

    // Get UserTenants
    const tenantLinks = await db.query.userTenants.findMany({
        where: eq(userTenants.userId, user.id)
    });

    console.log("Tenant Links:", tenantLinks);

    for (const link of tenantLinks) {
        if (link.teamId) {
            const team = await db.query.teams.findFirst({
                where: eq(teams.id, link.teamId)
            });
            console.log(`Linked Team ID: ${link.teamId} -> Name: ${team?.name}, Category: ${team?.teamCategory}`);
        } else {
            console.log(`Tenant ${link.tenantId} has NO Team ID linked.`);
        }
    }

    process.exit(0);
}

main().catch(console.error);
