
import "dotenv/config";
import { db } from "./server/db.ts";
import { incomingRecords } from "./shared/schema.ts";
import { desc } from "drizzle-orm";

async function showRawLatest() {
    const records = await db.select()
        .from(incomingRecords)
        .orderBy(desc(incomingRecords.createdAt))
        .limit(1);

    if (!records.length) {
        console.log("No records");
        process.exit(0);
    }

    const r = records[0];
    console.log(`ID: ${r.id}, Created: ${r.createdAt}`);

    // attributes 전체 출력 (Base64가 너무 길면 자르기)
    let attrs = r.attributes;
    if (typeof attrs === 'string') attrs = JSON.parse(attrs);

    const str = JSON.stringify(attrs, (key, value) => {
        if (key === 'data' && typeof value === 'string' && value.length > 100) {
            return value.substring(0, 20) + "...(Base64 Hidden)...";
        }
        return value;
    }, 2);

    console.log(str);
    process.exit(0);
}

showRawLatest();
