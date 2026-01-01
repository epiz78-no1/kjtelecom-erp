import { db } from "../server/db";
import { users } from "../shared/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

async function testLogin(username: string, pass: string) {
    const user = await db.query.users.findFirst({
        where: eq(users.username, username)
    });

    if (!user) {
        console.log(`User ${username} not found`);
        return;
    }

    const isValid = await bcrypt.compare(pass, user.password);
    console.log(`User ${username} login with ${pass}: ${isValid}`);
}

async function run() {
    await testLogin("admin", "admin");
    await testLogin("admin", "123456");
    await testLogin("admin1", "123456");
    process.exit(0);
}

run();
