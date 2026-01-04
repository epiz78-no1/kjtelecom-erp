
import { db } from "../db";
import { incomingRecords, outgoingRecords, materialUsageRecords, inventoryItems } from "@shared/schema";
import { eq, and } from "drizzle-orm";

async function verifyCLMux() {
    const productName = "C/L-MUX전용함";
    console.log(`=== Verification for ${productName} ===\n`);

    // 1. Get Inventory Item Status
    const items = await db.select().from(inventoryItems).where(eq(inventoryItems.productName, productName));
    console.log("--- Current Inventory DB Status ---");
    items.forEach(item => {
        console.log(`Spec: ${item.specification}`);
        console.log(`  Office Stock (Remaining): ${item.remaining}`);
        console.log(`  Total Sent to Team (Outgoing): ${item.outgoing}`);
        console.log(`  Total Used (Usage): ${item.usage}`);
        const teamStock = item.outgoing - item.usage;
        console.log(`  Calculated Team Stock: ${teamStock}`);
        console.log(`  Total Stock (Office + Team): ${item.remaining + teamStock}`);
    });
    console.log("\n");

    // 2. Raw Incoming Records
    const incoming = await db.select().from(incomingRecords).where(eq(incomingRecords.productName, productName));
    const totalIncoming = incoming.reduce((sum, r) => sum + r.quantity, 0);
    console.log(`--- Raw Incoming Records (Total: ${totalIncoming}) ---`);
    incoming.forEach(r => console.log(`  [${r.date}] +${r.quantity} (Spec: ${r.specification})`));
    console.log("\n");

    // 3. Raw Outgoing Records
    const outgoing = await db.select().from(outgoingRecords).where(eq(outgoingRecords.productName, productName));
    const totalOutgoing = outgoing.reduce((sum, r) => sum + r.quantity, 0);
    console.log(`--- Raw Outgoing Records (Total Sent to Team: ${totalOutgoing}) ---`);
    outgoing.forEach(r => console.log(`  [${r.date}] -> ${r.teamCategory} : ${r.quantity} (Spec: ${r.specification})`));
    console.log("\n");

    // 4. Raw Usage Records
    const usage = await db.select().from(materialUsageRecords).where(eq(materialUsageRecords.productName, productName));
    const totalUsage = usage.reduce((sum, r) => sum + r.quantity, 0);
    console.log(`--- Raw Usage Records (Total Used: ${totalUsage}) ---`);
    usage.forEach(r => console.log(`  [${r.date}] Team: ${r.teamCategory} Used: ${r.quantity} (Spec: ${r.specification})`));
    console.log("\n");

    // 5. Team Stock Breakdown
    console.log("--- Team Stock Breakdown (Sent - Used) ---");
    const teamMap = new Map<string, { sent: number, used: number }>();

    outgoing.forEach(r => {
        const key = r.teamCategory.trim();
        if (!teamMap.has(key)) teamMap.set(key, { sent: 0, used: 0 });
        teamMap.get(key)!.sent += r.quantity;
    });

    usage.forEach(r => {
        const key = r.teamCategory.trim();
        // Initialize if usage exists without outgoing (anomaly)
        if (!teamMap.has(key)) teamMap.set(key, { sent: 0, used: 0 });
        teamMap.get(key)!.used += r.quantity;
    });

    let calculatedTotalTeamStock = 0;
    for (const [team, stats] of teamMap.entries()) {
        const stock = stats.sent - stats.used;
        calculatedTotalTeamStock += stock;
        console.log(`  ${team}: Received ${stats.sent} - Used ${stats.used} = Stock ${stock}`);
    }

    console.log(`\nAggregated Total Team Stock: ${calculatedTotalTeamStock}`);
    console.log(`Aggregated Office Stock (Total Incoming ${totalIncoming} - Total Sent ${totalOutgoing}): ${totalIncoming - totalOutgoing}`);

    process.exit(0);
}

verifyCLMux().catch(console.error);
