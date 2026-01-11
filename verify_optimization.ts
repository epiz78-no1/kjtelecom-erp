import "dotenv/config";
import { db } from "./server/db";
import { materialUsageRecords } from "./shared/schema";
import { sql, desc } from "drizzle-orm";

async function verify() {
    console.log("Verifying FINAL optimization (Stripping 'data' and legacy 'attachment')...");

    // Optimized Query:
    // 1. If 'attachments' array exists, clean 'data' from each element.
    // 2. ALWAYS strip root 'data' (legacy).
    // 3. ALWAYS strip root 'attachment' (legacy duplicate).
    const optimizedQuery = await db.select({
        id: materialUsageRecords.id,
        attributes: sql<string>`
                (
                    CASE 
                        WHEN length(${materialUsageRecords.attributes}) < 1000 THEN ${materialUsageRecords.attributes}::jsonb
                        WHEN ${materialUsageRecords.attributes}::jsonb ? 'attachments' THEN
                            jsonb_set(
                                ${materialUsageRecords.attributes}::jsonb,
                                '{attachments}',
                                COALESCE(
                                    (
                                        SELECT jsonb_agg(element - 'data')
                                        FROM jsonb_array_elements(${materialUsageRecords.attributes}::jsonb -> 'attachments') AS element
                                    ),
                                    '[]'::jsonb
                                )
                            )
                        ELSE ${materialUsageRecords.attributes}::jsonb
                    END
                ) 
                - 'data' 
                - 'attachment'`
    })
        .from(materialUsageRecords)
        .orderBy(desc(materialUsageRecords.id))
        .limit(3);

    console.log("\n[FINAL OPTIMIZATION RESULT] Top 3 Records:");
    for (const record of optimizedQuery) {
        if (!record.attributes) {
            console.log(`ID: ${record.id}, Size: 0 bytes`);
            continue;
        }
        // The result is an object (jsonb), so stringify to get length
        const attrStr = JSON.stringify(record.attributes);
        const sizeStr = attrStr.length;
        const sizeKB = (sizeStr / 1024).toFixed(2);
        console.log(`ID: ${record.id}, Payload Size: ${sizeStr.toLocaleString()} bytes (~${sizeKB} KB)`);

        if (record.id === 48) {
            console.log("--- ID 48 Keys ---");
            // @ts-ignore
            console.log(Object.keys(record.attributes));
        }
    }

    process.exit(0);
}

verify().catch(console.error);
