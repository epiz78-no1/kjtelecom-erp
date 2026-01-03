import { db } from "./db.js";
import { users, tenants, userTenants, inventoryItems, incomingRecords, outgoingRecords, materialUsageRecords } from "../shared/schema.js";
import { eq, and, isNull, inArray } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";

const SALT_ROUNDS = 10;

export async function ensureUsers() {
    console.log("🔒 Running Auto-Ensure Users...");

    // 0. Ensure Super Admin Always Exists
    const adminPassword = await bcrypt.hash("admin", SALT_ROUNDS);
    let [adminUser] = await db.select().from(users).where(eq(users.username, "admin"));

    if (!adminUser) {
        [adminUser] = await db.insert(users).values({
            id: randomUUID(),
            username: "admin",
            password: adminPassword,
            name: "최고관리자"
        }).returning();
        console.log("✅ Created Super Admin (System Default)");
    } else {
        console.log("ℹ️ Super Admin already exists");
    }

    // 1. Tenants (Assume exist or create)
    // Try to find the main tenant by various common slugs
    // 1. Tenants (Assume exist or create)
    // Try to find the main tenant by various common slugs
    const targetSlugs = ['gwangtel', 'KJtelecom', 'gwangju-telecom', 'default'];
    let mainTenant = await db.query.tenants.findFirst({
        where: inArray(tenants.slug, targetSlugs)
    });

    let [hanju] = await db.select().from(tenants).where(eq(tenants.slug, 'hanju'));

    if (!mainTenant && !hanju) {
        // Fallback: Use ANY first tenant found
        mainTenant = await db.query.tenants.findFirst();
    }

    // Alias for backward compatibility with existing code
    const gwangtel = mainTenant;

    if (!gwangtel) {
        console.log("No tenants found at all, skipping regular user ensure.");
    } else {
        const usersToCreate = [
            // Admin is handled above
            {
                username: "admin1",
                password: "123456",
                name: "광주텔레콤 관리자", // Changed from "최고관리자" to avoid confusion with SuperAdmin
                tenants: [
                    { id: gwangtel.id, role: "owner" }
                ]
            },
            {
                username: "admin2",
                password: "123456",
                name: "한주관리자",
                tenants: hanju ? [{ id: hanju.id, role: "owner" }] : []
            },
            {
                username: "inventory01",
                password: "123456",
                name: "재고담당자",
                tenants: [
                    {
                        id: gwangtel.id,
                        role: "member",
                        permissions: {
                            incoming: "write",
                            outgoing: "write",
                            usage: "read",
                            inventory: "write"
                        }
                    }
                ]
            },
            {
                username: "field01",
                password: "123456",
                name: "현장작업자",
                tenants: [
                    {
                        id: gwangtel.id,
                        role: "member",
                        permissions: {
                            incoming: "none",
                            outgoing: "own_only",
                            usage: "own_only",
                            inventory: "read"
                        }
                    }
                ]
            },
            {
                username: "readonly01",
                password: "123456",
                name: "조회담당자",
                tenants: [
                    {
                        id: gwangtel.id,
                        role: "member",
                        permissions: {
                            incoming: "read",
                            outgoing: "read",
                            usage: "read",
                            inventory: "read"
                        }
                    }
                ]
            }
        ];

        for (const u of usersToCreate) {
            const hashedPassword = await bcrypt.hash(u.password, SALT_ROUNDS);

            // Find or Create User
            let [existingUser] = await db.select().from(users).where(eq(users.username, u.username));
            if (!existingUser) {
                try {
                    [existingUser] = await db.insert(users).values({
                        id: randomUUID(),
                        username: u.username,
                        password: hashedPassword,
                        name: u.name
                    }).returning();
                    console.log(`✅ Created User: ${u.username}`);
                } catch (e) {
                    // Ignore unique violation race conditions
                }
            }

            if (existingUser) {
                // Skip updating existing users to speed up startup
                // await db.update(users).set({ password: hashedPassword, name: u.name }).where(eq(users.id, existingUser.id));
            }


            // Link Tenants for regular users
            for (const t of u.tenants) {
                const [existingLink] = await db.select().from(userTenants).where(
                    and(eq(userTenants.userId, existingUser.id), eq(userTenants.tenantId, t.id))
                );

                if (!existingLink) {
                    await db.insert(userTenants).values({
                        id: randomUUID(),
                        userId: existingUser.id,
                        tenantId: t.id,
                        role: t.role,
                        permissions: (t as any).permissions,
                        status: "active"
                    });
                } else {
                    await db.update(userTenants).set({
                        role: t.role,
                        permissions: (t as any).permissions
                    }).where(eq(userTenants.id, existingLink.id));
                }
            }
        }

        if (adminUser) {
            const tenantsToLink = [];
            if (gwangtel) tenantsToLink.push({ id: gwangtel.id, role: 'admin' });
            if (hanju) tenantsToLink.push({ id: hanju.id, role: 'admin' });

            for (const t of tenantsToLink) {
                const [existingLink] = await db.select().from(userTenants).where(
                    and(eq(userTenants.userId, adminUser.id), eq(userTenants.tenantId, t.id))
                );

                if (!existingLink) {
                    await db.insert(userTenants).values({
                        id: randomUUID(),
                        userId: adminUser.id,
                        tenantId: t.id,
                        role: "admin",
                        status: "active"
                    });
                    console.log(`🔗 Linked SuperAdmin to tenant ${t.id}`);
                }
            }
        }

        console.log("✨ Ensure Users Completed");
    }
}

export async function backfillInventory() {
    console.log("🔄 Running Auto-Backfill Inventory...");

    const allItems = await db.select().from(inventoryItems);
    const itemMap = new Map();
    for (const item of allItems) {
        const key = `${item.tenantId}|${item.productName}|${item.specification}|${item.division}`;
        itemMap.set(key, item.id);
    }

    // Incoming
    const incoming = await db.select().from(incomingRecords).where(isNull(incomingRecords.inventoryItemId));
    for (const rec of incoming) {
        const key = `${rec.tenantId}|${rec.productName}|${rec.specification}|${rec.division}`;
        const itemId = itemMap.get(key);
        if (itemId) {
            await db.update(incomingRecords).set({ inventoryItemId: itemId }).where(eq(incomingRecords.id, rec.id));
        }
    }

    // Outgoing
    const outgoing = await db.select().from(outgoingRecords).where(isNull(outgoingRecords.inventoryItemId));
    for (const rec of outgoing) {
        const key = `${rec.tenantId}|${rec.productName}|${rec.specification}|${rec.division}`;
        const itemId = itemMap.get(key);
        if (itemId) {
            await db.update(outgoingRecords).set({ inventoryItemId: itemId }).where(eq(outgoingRecords.id, rec.id));
        }
    }

    // Usage
    const usage = await db.select().from(materialUsageRecords).where(isNull(materialUsageRecords.inventoryItemId));
    for (const rec of usage) {
        const key = `${rec.tenantId}|${rec.productName}|${rec.specification}|${rec.division}`;
        const itemId = itemMap.get(key);
        if (itemId) {
            await db.update(materialUsageRecords).set({ inventoryItemId: itemId }).where(eq(materialUsageRecords.id, rec.id));
        }
    }

    console.log("✨ Backfill Completed");
}
