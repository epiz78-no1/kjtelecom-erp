
import * as dotenv from "dotenv";
dotenv.config();
import { db } from "../server/db";
import { outgoingRecords } from "../shared/schema";
import { isNull, sql } from "drizzle-orm";

async function check() {
  try {
    const result = await db.select({ count: sql`count(*)` }).from(outgoingRecords).where(isNull(outgoingRecords.inventoryItemId));
    console.log("Null inventoryItemId count:", result[0].count);
  } catch (e) {
    console.error(e);
  }
  process.exit(0);
}

check();

