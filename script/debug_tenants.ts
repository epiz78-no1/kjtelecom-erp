
import { db } from '../server/db';
import { tenants, users, userTenants } from '../shared/schema';
import { eq } from 'drizzle-orm';

async function main() {
    console.log("=== Debugging Tenants and Admins ===");

    const allTenants = await db.select().from(tenants);

    for (const tenant of allTenants) {
        console.log(`\nTenant: ${tenant.name} (${tenant.slug}) [ID: ${tenant.id}]`);

        const relations = await db.query.userTenants.findMany({
            where: eq(userTenants.tenantId, tenant.id),
            with: {
                user: true
            }
        });

        if (relations.length === 0) {
            console.log("  No members found.");
        } else {
            relations.forEach(r => {
                console.log(`  - User: ${r.user.username} (${r.user.name}) | Role: ${r.role} | Status: ${r.status}`);
            });
        }
    }

    console.log("\n=== End Debug ===");
    process.exit(0);
}

main().catch(console.error);
