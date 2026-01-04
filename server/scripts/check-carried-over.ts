
import { db } from "../db";
import { inventoryItems } from "@shared/schema";
import { eq } from "drizzle-orm";

async function checkCarriedOver() {
    const item = await db.query.inventoryItems.findFirst({
        where: eq(inventoryItems.productName, "C/L-MUX전용함")
    });
    console.log("Carried Over:", item?.carriedOver);
    process.exit(0);
}
checkCarriedOver();
