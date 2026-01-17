import "dotenv/config";
import { db } from "../server/db.js";
import { incomingRecords } from "../shared/schema.js";
import { desc, isNotNull } from "drizzle-orm";

async function checkFileStructure() {
    console.log("=== 파일 구조 확인 ===\n");

    const records = await db
        .select()
        .from(incomingRecords)
        .where(isNotNull(incomingRecords.attributes))
        .orderBy(desc(incomingRecords.createdAt))
        .limit(3);

    for (const record of records) {
        console.log(`\n레코드 ID: ${record.id}`);
        console.log(`제품명: ${record.productName}`);

        if (record.attributes) {
            const attrs = typeof record.attributes === 'string'
                ? JSON.parse(record.attributes)
                : record.attributes;

            console.log("\n첨부파일 정보:");

            if (attrs.attachments && Array.isArray(attrs.attachments)) {
                attrs.attachments.forEach((file: any, idx: number) => {
                    console.log(`\n  파일 ${idx + 1}:`);
                    console.log(`    - name: ${file.name}`);
                    console.log(`    - storagePath: ${file.storagePath || 'N/A'}`);
                    console.log(`    - storageUrl: ${file.storageUrl || 'N/A'}`);

                    if (file.storageUrl) {
                        const urlParts = file.storageUrl.split('/');
                        console.log(`    - URL 마지막 부분: ${urlParts[urlParts.length - 1]}`);
                    }
                });
            } else if (attrs.attachment) {
                console.log(`  단일 파일:`);
                console.log(`    - name: ${attrs.attachment.name}`);
                console.log(`    - storagePath: ${attrs.attachment.storagePath || 'N/A'}`);
                console.log(`    - storageUrl: ${attrs.attachment.storageUrl || 'N/A'}`);
            } else {
                console.log("  첨부파일 없음");
            }
        }
        console.log("\n" + "=".repeat(60));
    }

    process.exit(0);
}

checkFileStructure().catch(console.error);
