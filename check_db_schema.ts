import { db } from "./server/db";
import { sql } from "drizzle-orm";

async function main() {
    console.log("Checking DB schema...");
    try {
        const result = await db.execute(sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'optical_cables' 
      AND column_name = 'total_length';
    `);
        console.log("Column Info:", result);
    } catch (error) {
        console.error("Check failed:", error);
    }
    process.exit(0);
}

main();
