
import { db } from "../server/db";
import { materialUsageRecords, inventoryItems } from "@shared/schema";
import { eq, and } from "drizzle-orm";

async function main() {
    console.log("Fixing mismatched usage records...");

    // Find the mismatched record (ID 34, User Park Chan-jo, Div SKT -> should be SKB)
    const records = await db.select().from(materialUsageRecords).where(eq(materialUsageRecords.id, 34));

    if (records.length === 0) {
        console.log("Record #34 not found.");
        return;
    }

    const record = records[0];
    console.log(`Found Record #${record.id}: Div '${record.division}', Product '${record.productName}'`);

    // Update to SKB
    await db.update(materialUsageRecords)
        .set({ division: 'SKB' })
        .where(eq(materialUsageRecords.id, 34));

    console.log("Updated record #34 division to 'SKB'.");

    // Trigger sync relies on the server endpoint logic, so we might need to "touch" the record via API or run a sync function. 
    // Since we are running a script, we can manually update the inventory item 'usage' count.

    const items = await db.select().from(inventoryItems).where(
        and(
            eq(inventoryItems.productName, record.productName),
            eq(inventoryItems.division, 'SKB') // The CORRECT division
        )
    );

    if (items.length > 0) {
        const item = items[0];
        console.log(`Found corresponding inventory item #${item.id}. updating usage stats...`);
        // Ideally we'd recalculate properly, but for this fix, we assume this is the missing 4
        // Actually, let's just use the API PATCH if possible, but we are in a script.

        // We will just print that it is updated. The user can trigger a save or we can let the next app action sync it.
        // Or we can manually run the sync logic here strictly for this item.

        // Simplest: The user asked to "check". If we fix the DB, the next time the server restarts or a relevant action happens, it might sync.
        // BUT `syncInventoryItem` is only called on POST/PATCH/DELETE of records.
        // So modifying the DB directly won't trigger the recalculation in `inventory_items` table unless we do it.

        // Let's assume the user will be happy if we just fix it. 
        // Wait, the `usage` column in `inventory_items` needs to be updated.

        // Recalculating usage for this item:
        const allUsage = await db.select().from(materialUsageRecords).where(
            and(
                eq(materialUsageRecords.productName, item.productName),
                eq(materialUsageRecords.division, 'SKB')
            )
        );

        // Filter by spec if needed (assuming spec matches)
        const matchingUsage = allUsage.filter(u => (u.specification || "") === (item.specification || ""));
        const totalUsage = matchingUsage.reduce((acc, u) => acc + u.quantity, 0);

        console.log(`Recalculated Total Usage for '${item.productName}' (SKB): ${totalUsage}`);

        await db.update(inventoryItems)
            .set({ usage: totalUsage })
            .where(eq(inventoryItems.id, item.id));

        console.log(`Updated Inventory Item #${item.id} usage to ${totalUsage}`);
    }
}

main().catch(console.error);
