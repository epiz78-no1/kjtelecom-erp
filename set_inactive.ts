
import { db } from "./server/db";
import { userTenants } from "./shared/schema";
import { eq } from "drizzle-orm";

async function setInactive() {
    console.log("Setting user aa523129-b743-4be5-9e8e-16b49595f8ff to inactive...");
    await db.update(userTenants)
        .set({ status: 'inactive' })
        .where(eq(userTenants.userId, 'aa523129-b743-4be5-9e8e-16b49595f8ff'));
    console.log("Done.");
    process.exit(0);
}

setInactive().catch(console.error);
