import "dotenv/config";
import { db } from "../server/db.js";
import { opticalCableLogs } from "../shared/schema.js";
import { desc, eq } from "drizzle-orm";

async function checkLatestLog() {
    console.log("=== 최근 광케이블 출고 로그 확인 ===\n");

    const logs = await db
        .select()
        .from(opticalCableLogs)
        .where(eq(opticalCableLogs.logType, 'assign'))
        .orderBy(desc(opticalCableLogs.createdAt))
        .limit(1);

    if (logs.length === 0) {
        console.log("출고 로그가 없습니다.");
        process.exit(0);
    }

    const log = logs[0];
    console.log(`로그 ID: ${log.id}`);
    console.log(`케이블 ID: ${log.cableId}`);
    console.log(`팀 ID: ${log.teamId}`);
    console.log(`생성일: ${log.createdAt}`);

    console.log("\nattributes 필드:");
    if (log.attributes) {
        const attrs = typeof log.attributes === 'string'
            ? JSON.parse(log.attributes)
            : log.attributes;

        console.log(JSON.stringify(attrs, null, 2));

        if (attrs.attachments) {
            console.log(`\n첨부파일 개수: ${attrs.attachments.length}`);
            attrs.attachments.forEach((file: any, idx: number) => {
                console.log(`\n파일 ${idx + 1}:`);
                console.log(`  - name: ${file.name}`);
                console.log(`  - storagePath: ${file.storagePath}`);
                console.log(`  - storageUrl: ${file.storageUrl}`);
            });
        } else {
            console.log("\n⚠️  attachments 필드가 없습니다!");
        }
    } else {
        console.log("attributes가 null입니다.");
    }

    process.exit(0);
}

checkLatestLog().catch(console.error);
