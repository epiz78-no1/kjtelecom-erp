
import { db } from "../server/db";
import { users, userTenants, InsertUserTenant } from "@shared/schema";
import { eq } from "drizzle-orm";
import { DatabaseStorage } from "../server/storage";

const storage = new DatabaseStorage();

async function run() {
    console.log("Starting Phone Update Debug...");

    // 1. Get first user
    const allMembers = await storage.getMembers("default"); // assuming 'default' tenant or similar. 
    // Wait, getMembers needs tenantId. Let's find a valid tenantId.
    // Actually, I can just query users directly to find one.

    const [user] = await db.select().from(users).limit(1);
    if (!user) {
        console.log("No user found.");
        return;
    }
    console.log(`Target User: ${user.name} (ID: ${user.id})`);
    console.log(`Current Phone: ${user.phoneNumber}`);

    // Find tenantId for this user
    const [ut] = await db.select().from(userTenants).where(eq(userTenants.userId, user.id));
    if (!ut) {
        console.log("User has no tenant.");
        return;
    }
    const tenantId = ut.tenantId;

    // 2. Update Phone
    const newPhone = "010-9999-8888";
    console.log(`Updating Phone to: ${newPhone}`);

    await storage.updateMember(user.id, tenantId, {
        phoneNumber: newPhone,
        positionId: ut.positionId, // Required by type? No, partial.
        // But updateMember signature: updates: Partial<InsertUserTenant> & { name?: string; phoneNumber?: string }
    });

    // 3. Verify
    const [updatedUser] = await db.select().from(users).where(eq(users.id, user.id));
    console.log(`Updated User Phone in DB: ${updatedUser.phoneNumber}`);

    if (updatedUser.phoneNumber === newPhone) {
        console.log("SUCCESS: Phone number updated in DB.");
    } else {
        console.log("FAILURE: Phone number NOT updated in DB.");
    }

    const members = await storage.getMembers(tenantId);
    const member = members.find(m => m.id === user.id);
    console.log(`Phone in getMembers(): ${member?.phoneNumber}`);

    process.exit(0);
}

run().catch(console.error);
