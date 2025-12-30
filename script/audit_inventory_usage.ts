
import { db } from "../server/db";
import { inventoryItems, incomingRecords, outgoingRecords, materialUsageRecords } from "@shared/schema";
import { eq } from "drizzle-orm";

async function main() {
    console.log("Starting Inventory Audit...");

    const items = await db.select().from(inventoryItems);
    const incoming = await db.select().from(incomingRecords);
    const outgoing = await db.select().from(outgoingRecords);
    const usage = await db.select().from(materialUsageRecords);

    console.log(`Loaded ${items.length} items, ${incoming.length} incoming, ${outgoing.length} outgoing, ${usage.length} usage records.`);

    let mismatches = 0;

    for (const item of items) {
        // Calculate expected values
        const itemIncoming = incoming
            .filter(r => r.productName === item.productName && (r.specification || "") === (item.specification || "") && r.division === item.division)
            .reduce((sum, r) => sum + (r.quantity || 0), 0);

        const itemSentToTeam = outgoing
            .filter(r => r.productName === item.productName && (r.specification || "") === (item.specification || "") && r.division === item.division)
            .reduce((sum, r) => sum + (r.quantity || 0), 0);

        const itemUsage = usage
            .filter(r => r.productName === item.productName && (r.specification || "") === (item.specification || "") && r.division === item.division)
            .reduce((sum, r) => sum + (r.quantity || 0), 0);

        // Logic:
        // Office Stock (Remaining) = CarriedOver + Incoming - SentToTeam
        // Team Stock = SentToTeam - Usage

        const expectedRemaining = item.carriedOver + itemIncoming - itemSentToTeam;
        // The 'outgoing' column in Inventory Item table actually tracks 'Sent To Team'
        const expectedOutgoingStored = itemSentToTeam;
        // The 'usage' column in Inventory Item table tracks 'Usage'
        const expectedUsageStored = itemUsage;

        // Check for mismatches
        const mismatchRemaining = item.remaining !== expectedRemaining;
        const mismatchSent = item.outgoing !== expectedOutgoingStored;
        const mismatchUsage = item.usage !== expectedUsageStored;

        if (mismatchRemaining || mismatchSent || mismatchUsage) {
            mismatches++;
            console.log(`\n❌ MISMATCH for [${item.division}] ${item.productName} (${item.specification})`);

            if (mismatchRemaining) console.log(`   Office Stock (Remaining): DB=${item.remaining}, Calc=${expectedRemaining} (Diff: ${item.remaining - expectedRemaining})`);
            if (mismatchSent) console.log(`   Sent to Team (Outgoing):  DB=${item.outgoing}, Calc=${expectedOutgoingStored} (Diff: ${item.outgoing - expectedOutgoingStored})`);
            if (mismatchUsage) console.log(`   Team Usage:               DB=${item.usage},     Calc=${expectedUsageStored} (Diff: ${item.usage - expectedUsageStored})`);
        } else {
            // console.log(`✅ OK: ${item.productName}`);
        }
    }

    if (mismatches === 0) {
        console.log("\n✅ AUDIT COMPLETE: All inventory items match their records.");
    } else {
        console.log(`\n⚠️ AUDIT COMPLETE: Found ${mismatches} mismatches.`);
    }
}

main().catch(console.error);
