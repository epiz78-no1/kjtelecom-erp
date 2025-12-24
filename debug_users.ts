import { db } from "./server/db";
import { users } from "./shared/schema";

async function checkUsers() {
    const allUsers = await db.select().from(users);
    console.log("Current Users in DB:", allUsers.map(u => ({
        id: u.id,
        username: u.username,
        name: u.name,
        passwordHash: u.password.substring(0, 10) + "..."
    })));
}

checkUsers().catch(console.error);
