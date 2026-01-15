
import "dotenv/config";
import { db } from "./server/db";
import { users } from "./shared/schema";
import { eq } from "drizzle-orm";

async function testQuery() {
    try {
        console.log("Testing DB Query...");
        const result = await db.select().from(users).limit(1);
        console.log("Query Successful:", result);
    } catch (e: any) {
        console.error("Query Failed:", e);
        console.error("Error Message:", e.message);
    }
    process.exit(0);
}

testQuery();
