
import "dotenv/config";
import { db } from "./server/db.ts";
import { incomingRecords } from "./shared/schema.ts";
import { desc } from "drizzle-orm";

async function inspectAttributes() {
    console.log("🔍 최근 5개 입고 내역 분석 (DB vs Storage)...");

    const records = await db.select()
        .from(incomingRecords)
        .orderBy(desc(incomingRecords.createdAt))
        .limit(5);

    records.forEach(r => {
        console.log(`\n🆔 레코드 ID: ${r.id} (생성일: ${new Date(r.createdAt).toLocaleString()})`);

        let attrs: any = r.attributes;
        if (typeof attrs === 'string') {
            try {
                attrs = JSON.parse(attrs);
            } catch (e) {
                console.log("   - ⚠️ JSON 파싱 실패");
                return;
            }
        }

        // Check for Attachment structure
        const attachment = attrs.attachment || (attrs.attachments && attrs.attachments[0]);

        if (attachment) {
            console.log("   📂 첨부파일 정보:");

            // 1. Check if huge Base64 data exists (OLD WAY)
            if (attachment.data && attachment.data.length > 200) {
                console.log(`     ❌ [이전 방식] 파일 내용이 DB에 들어있습니다. (Base64)`);
                console.log(`     - 텍스트 길이: ${attachment.data.length.toLocaleString()} 글자 (DB 용량 차지함)`);
            } else {
                console.log(`     ✅ [성공] DB에 파일 내용이 없습니다. (가벼움)`);
            }

            // 2. Check if Storage URL exists (NEW WAY)
            if (attachment.storageUrl) {
                console.log(`     ✅ [새로운 방식] Storage 주소(URL)만 저장됨`);
                console.log(`     - 링크: ${attachment.storageUrl}`);
            } else {
                console.log(`     ⚠️ Storage 링크가 발견되지 않음`);
            }
        } else {
            console.log("   - 첨부파일 없음");
        }
    });

    process.exit(0);
}

inspectAttributes();
