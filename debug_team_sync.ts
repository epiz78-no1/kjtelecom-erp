
import { db } from "./server/db";
import { users, userTenants, teams, divisions } from "./shared/schema";
import { eq, sql, count } from "drizzle-orm";

async function main() {
    console.log("🔍 Starting Debug Inspection...");

    // 1. Find the user 'field01' (현장작업자)
    console.log("\n👤 Inspecting User: 'field01' (현장작업자)");
    const user = await db.query.users.findFirst({
        where: eq(users.username, "field01")
    });

    if (!user) {
        console.log("❌ User 'field01' not found!");
    } else {
        console.log(`✅ User Found: ${user.name} (${user.id})`);

        // 2. Find UserTenant record
        const ut = await db.query.userTenants.findFirst({
            where: eq(userTenants.userId, user.id)
        });

        if (!ut) {
            console.log("❌ UserTenant record not found!");
        } else {
            console.log(`✅ UserTenant Found: TeamID=${ut.teamId}, DivisionID=${ut.divisionId}`);

            if (ut.teamId) {
                // 3. Find the linked Team
                const linkedTeam = await db.query.teams.findFirst({
                    where: eq(teams.id, ut.teamId)
                });
                if (linkedTeam) {
                    console.log(`✅ Linked Team: "${linkedTeam.name}" (ID: ${linkedTeam.id}, Tenant: ${linkedTeam.tenantId})`);
                } else {
                    console.log(`❌ Linked Team (ID: ${ut.teamId}) NOT FOUND in teams table!`);
                }
            } else {
                console.log("⚠️ User has no team assigned.");
            }
        }
    }

    // 4. List ALL Teams named "접속1팀"
    console.log("\n🏢 Inspecting Teams named '접속1팀'");

    // Storage-like query (ORIGINAL - FAILING)
    const storageLike = await db.select({
        id: teams.id,
        name: teams.name,
        memberCount: sql<number>`(SELECT count(*) FROM ${userTenants} WHERE ${userTenants.teamId} = ${teams.id})::int`
    }).from(teams).where(eq(teams.name, "접속1팀"));
    console.log("Original Storage Query Result:", storageLike);

    // Proposed Fix: JOIN + GROUP BY
    const fixQuery = await db.select({
        id: teams.id,
        name: teams.name,
        memberCount: count(userTenants.id)
    })
        .from(teams)
        .leftJoin(userTenants, eq(teams.id, userTenants.teamId))
        .where(eq(teams.name, "접속1팀"))
        .groupBy(teams.id);

    console.log("Proposed Fix Query Result:", fixQuery);

    const matchingTeams = await db.query.teams.findMany({
        where: eq(teams.name, "접속1팀")
    });

    if (matchingTeams.length === 0) {
        console.log("❌ No teams named '접속1팀' found.");
    } else {
        for (const t of matchingTeams) {
            console.log(`- Team: "${t.name}" (ID: ${t.id}, Tenant: ${t.tenantId})`);
            // Count members manually
            const memberCount = await db.select({ count: userTenants.id }).from(userTenants).where(eq(userTenants.teamId, t.id));
            console.log(`  -> Actual DB Member Count: ${memberCount.length}`);
        }
    }

    console.log("\n🏁 Debug Inspection Complete.");
    process.exit(0);
}

main().catch(console.error);
