
import { db } from "../server/db";
import { inventoryItems } from "../shared/schema";

async function main() {
    console.log("Fetching inventory items...");
    const items = await db.select().from(inventoryItems);
    console.log(`Found ${items.length} items.`);
    items.forEach(item => {
        console.log(`ID: ${item.id}, Name: ${item.productName}, Division: '${item.division}'`);
    });
    process.exit(0);
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
