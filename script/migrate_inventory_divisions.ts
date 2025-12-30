
import { db } from "../server/db";
import { inventoryItems } from "../shared/schema";
import { eq } from "drizzle-orm";

async function main() {
    console.log("Migrating inventory divisions based on category...");

    // Find items where category is 'SKB' but division might be wrong
    // To be safe, we'll explicitly set division to SKB if category is SKB
    const skbItems = await db.select().from(inventoryItems).where(eq(inventoryItems.category, 'SKB'));

    console.log(`Found ${skbItems.length} SKB category items.`);

    for (const item of skbItems) {
        if (item.division !== 'SKB') {
            console.log(`Updating Item ${item.id} (${item.productName}): Division '${item.division}' -> 'SKB'`);
            await db.update(inventoryItems)
                .set({ division: 'SKB' })
                .where(eq(inventoryItems.id, item.id));
        } else {
            console.log(`Item ${item.id} already has correct division.`);
        }
    }

    // Also check for SKT just in case
    const sktItems = await db.select().from(inventoryItems).where(eq(inventoryItems.category, 'SKT'));
    console.log(`Found ${sktItems.length} SKT category items.`);
    for (const item of sktItems) {
        if (item.division !== 'SKT') {
            console.log(`Updating Item ${item.id} (${item.productName}): Division '${item.division}' -> 'SKT'`);
            await db.update(inventoryItems)
                .set({ division: 'SKT' })
                .where(eq(inventoryItems.id, item.id));
        }
    }

    console.log("Migration completed.");
    process.exit(0);
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
