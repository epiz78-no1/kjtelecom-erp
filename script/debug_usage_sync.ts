
import { db } from "../server/db";
import { materialUsageRecords, inventoryItems } from "@shared/schema";
import { eq, desc } from "drizzle-orm";

async function main() {
    console.log("Checking recent material usage records...");

    const usages = await db.select().from(materialUsageRecords).orderBy(desc(materialUsageRecords.id)).limit(5);
    const items = await db.select().from(inventoryItems);

    for (const usage of usages) {
        console.log(`\nUsage Record #${usage.id}:`);
        console.log(`  User: ${usage.recipient}`);
        console.log(`  Product: '${usage.productName}'`);
        console.log(`  Spec: '${usage.specification}'`);
        console.log(`  Division: '${usage.division}'`);
        console.log(`  Qty: ${usage.quantity}`);

        const matchingItem = items.find(i =>
            i.productName === usage.productName &&
            (i.specification || "") === (usage.specification || "") &&
            i.division === usage.division
        );

        if (matchingItem) {
            console.log(`  ✅ MATCHING INVENTORY ITEM FOUND: ID ${matchingItem.id}`);
            console.log(`     Current Item Stats - Outgoing: ${matchingItem.outgoing}, Usage: ${matchingItem.usage}, Remaining: ${matchingItem.remaining}`);
        } else {
            console.log(`  ❌ NO MATCHING INVENTORY ITEM FOUND!`);
            // Try to find partial matches to give a hint
            const partialMatch = items.find(i => i.productName === usage.productName);
            if (partialMatch) {
                console.log(`     (Hint: Found item with same name but diff spec/div: ID ${partialMatch.id}, Spec: '${partialMatch.specification}', Div: '${partialMatch.division}')`);
            }
        }
    }
}

main().catch(console.error);
