import { db } from "../server/db";
import { users } from "../shared/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

const SALT_ROUNDS = 10;

async function reset() {
    console.log("Resetting passwords...");

    const adminHash = await bcrypt.hash("admin", SALT_ROUNDS);
    await db.update(users).set({ password: adminHash }).where(eq(users.username, "admin"));
    console.log("Admin password set to 'admin'");

    const userHash = await bcrypt.hash("123456", SALT_ROUNDS);
    const others = ["admin1", "admin2", "inventory01", "field01", "readonly01", "user1", "user2"];
    for (const u of others) {
        await db.update(users).set({ password: userHash }).where(eq(users.username, u));
        console.log(`Password for ${u} set to '123456'`);
    }
    process.exit(0);
}

reset();
