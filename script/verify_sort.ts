
import { db } from "../server/db";
import { storage } from "../server/storage";

async function verify() {
    console.log("🔍 Verifying inventory sorting...");
    const tenant = await db.query.tenants.findFirst();
    if (!tenant) {
        console.log("❌ No tenant found to verify.");
        return;
    }

    console.log(`🏢 Checking tenant: ${tenant.name}`);
    const items = await storage.getInventoryItems(tenant.id);

    console.log("📦 Inventory Items (in order):");
    const names = items.map(i => i.productName);
    names.forEach(name => console.log(`- ${name}`));

    // Check if sorted
    const sorted = [...names].sort((a, b) => a.localeCompare(b));
    const isSorted = JSON.stringify(names) === JSON.stringify(sorted);

    if (isSorted) {
        console.log("✅ Items are correctly sorted alphabetically!");
    } else {
        console.log("❌ Items are NOT sorted.");
        console.log("Expected:", sorted);
    }
    process.exit(0);
}

verify().catch(console.error);
