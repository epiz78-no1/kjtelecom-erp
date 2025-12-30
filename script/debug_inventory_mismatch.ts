
import { db } from "../server/db";
import { inventoryItems } from "../shared/schema";

async function main() {
    console.log("Fetching inventory items...");
    const items = await db.select().from(inventoryItems);

    console.log("--- Items Analysis ---");
    items.forEach(item => {
        console.log(`ID: ${item.id}, Cat: '${item.category}', Div: '${item.division}', Name: ${item.productName}`);
    });

    process.exit(0);
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
