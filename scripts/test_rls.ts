import "dotenv/config";
import { db, pool, withTenant } from "../server/db";
import { users, tenants, userTenants, inventoryItems } from "@shared/schema";
import { eq, sql } from "drizzle-orm";
import { randomUUID } from "crypto";

async function main() {
    console.log("Starting RLS Verification Test...");

    try {
        // 1. Setup Test Data
        const tenantAId = randomUUID();
        const tenantBId = randomUUID();
        const itemAId = 999901;
        const itemBId = 999902;

        console.log("Creating test tenants...");
        // Bypass RLS for setup (users table has no RLS, neither does tenants/userTenants effectively for inserts if not blocked)
        // Actually, we enabled RLS on tenants/userTenants? No, we skipped them in enable_rls.sql except basic ones.
        // Wait, enable_rls.sql enabled RLS on inventory_items, etc.
        // We need to insert tenants first. 
        // Since we didn't enable RLS on 'tenants' table in our SQL (we removed it from plan to keep login safe), we can just insert.

        // Create Tenants
        await db.insert(tenants).values([
            { id: tenantAId, name: "Tenant A", slug: `tenant-a-${tenantAId}` },
            { id: tenantBId, name: "Tenant B", slug: `tenant-b-${tenantBId}` }
        ]).onConflictDoNothing();

        console.log("Creating test inventory items...");
        // Create Items using withTenant to ensure they are created with correct ownership or just raw insert if we want to test boundaries?
        // Let's use raw insert but we need to set session for RLS or use a bypass connection.
        // However, we are testing RLS. So we should use withTenant to create them "legitimately" or use Force RLS bypass?
        // The pool connection is superuser usually in dev, but we enabled FORCE RLS.
        // So even superuser needs policy or bypass. Superuser bypasses RLS by default unless NO FORCE used?
        // Wait, ALTER TABLE ... FORCE ROW LEVEL SECURITY applies RLS to the table owner too.
        // But Superusers (postgres) always bypass RLS unless they are not superusers.
        // Supabase default user IS superuser-like (postgres).
        // Let's see if we can just insert.

        // We will use withTenant to simulate being a user of that tenant.

        await withTenant(tenantAId, async (tx) => {
            await tx.insert(inventoryItems).values({
                id: itemAId,
                tenantId: tenantAId,
                productName: "Item A",
                specification: "Spec A",
                division: "SKT",
                category: "General"
            }).onConflictDoNothing();
        });

        await withTenant(tenantBId, async (tx) => {
            await tx.insert(inventoryItems).values({
                id: itemBId,
                tenantId: tenantBId,
                productName: "Item B",
                specification: "Spec B",
                division: "KT",
                category: "General"
            }).onConflictDoNothing();
        });

        // 2. Test: Tenant A should only see Item A
        console.log("\n[TEST] Verifying Tenant A Access...");
        const itemsForA = await withTenant(tenantAId, async (tx) => {
            return tx.select().from(inventoryItems);
        });

        console.log(`Tenant A sees ${itemsForA.length} items.`);
        if (itemsForA.find(i => i.id === itemBId)) {
            console.error("❌ FAILED: Tenant A can see Tenant B's item!");
        } else if (itemsForA.find(i => i.id === itemAId)) {
            console.log("✅ SUCCESS: Tenant A sees their own item and NOT Tenant B's.");
        } else {
            console.error("❌ FAILED: Tenant A cannot see their own item?");
        }

        // 3. Test: Tenant B should only see Item B
        console.log("\n[TEST] Verifying Tenant B Access...");
        const itemsForB = await withTenant(tenantBId, async (tx) => {
            return tx.select().from(inventoryItems);
        });

        console.log(`Tenant B sees ${itemsForB.length} items.`);
        if (itemsForB.find(i => i.id === itemAId)) {
            console.error("❌ FAILED: Tenant B can see Tenant A's item!");
        } else if (itemsForB.find(i => i.id === itemBId)) {
            console.log("✅ SUCCESS: Tenant B sees their own item and NOT Tenant A's.");
        } else {
            console.error("❌ FAILED: Tenant B cannot see their own item?");
        }

        // 4. Test: Cross-tenant access attempt (Querying specifically for ID)
        console.log("\n[TEST] Tenant A trying to fetch Item B by ID...");
        const crossAccess = await withTenant(tenantAId, async (tx) => {
            return tx.select().from(inventoryItems).where(eq(inventoryItems.id, itemBId));
        });

        if (crossAccess.length > 0) {
            console.error("❌ FAILED: Tenant A was able to fetch Item B by ID!");
        } else {
            console.log("✅ SUCCESS: Tenant A query for Item B returned empty result.");
        }

        // Cleanup
        console.log("\nCleaning up test data...");
        await db.delete(tenants).where(eq(tenants.id, tenantAId));
        await db.delete(tenants).where(eq(tenants.id, tenantBId));
        // Items cascade delete?
        // tenants has cascade delete for userTenants, inventoryItems etc?
        // Let's check schema. yes { onDelete: "cascade" } is in schema definition usually.
        // In schema.ts: tenantId: varchar("tenant_id")... .references(() => tenants.id, { onDelete: "cascade" })
        // So deleting tenants should clean up items.

    } catch (error) {
        console.error("Test failed with error:", error);
    } finally {
        await pool.end();
    }
}

main();
