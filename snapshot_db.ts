
import { storage } from "./server/storage";
import fs from "fs";

async function snapshot() {
    const tenants = await storage.getInventoryItems("ef3fc24d-9089-4c0c-b95e-bf3cd24d215d"); // Assuming default/first tenant or need to find one.
    // Actually, let's just dump ALL inventory items from DB directly to be safe, bypassing tenant check if possible, or just pick the active one.
    // Since I don't know the exact tenantId easily without querying, I'll cheat and use 'db' directly if I can, or just try to find a tenant.

    // Better approach: Get all items directly via DB query if possible, or use storage with a known tenant.
    // Let's use the hardcoded tenantId from previous context if available, or just list all tenants first.
}

// Retrying with a simpler script that queries the DB table directly
import { db } from "./server/db";
import { inventoryItems } from "./shared/schema";

async function run() {
    try {
        const items = await db.select().from(inventoryItems);
        console.log(JSON.stringify(items, null, 2));

        const summary = items.reduce((acc, item) => {
            acc.totalItems++;
            acc.totalRemaining += item.remaining;
            acc.totalOutgoing += item.outgoing;
            acc.totalAmount += (item.totalAmount || 0);
            return acc;
        }, { totalItems: 0, totalRemaining: 0, totalOutgoing: 0, totalAmount: 0 });

        console.error("SUMMARY:", JSON.stringify(summary, null, 2));
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

run();
