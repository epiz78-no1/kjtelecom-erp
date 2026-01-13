
import "dotenv/config";
import { db } from "./server/db.ts";
import { incomingRecords } from "./shared/schema.ts";
import { desc } from "drizzle-orm";
import { exec } from "child_process";

async function checkStorageConnection() {
    console.log("🔍 최신 입고 내역 조회 중...");

    const records = await db.select()
        .from(incomingRecords)
        .orderBy(desc(incomingRecords.createdAt))
        .limit(20);

    if (records.length === 0) {
        console.log("❌ 데이터가 없습니다.");
        process.exit(1);
    }

    let targetUrl = "";

    // Find first record with storage URL
    for (const record of records) {
        try {
            const attrs = typeof record.attributes === 'string'
                ? JSON.parse(record.attributes)
                : record.attributes;

            if (attrs.attachment?.storageUrl) {
                targetUrl = attrs.attachment.storageUrl;
                console.log(`✅ ID ${record.id}에서 Storage URL 발견: ${targetUrl}`);
                break;
            } else if (attrs.attachments?.length > 0) {
                const file = attrs.attachments.find((f: any) => f.storageUrl);
                if (file) {
                    targetUrl = file.storageUrl;
                    console.log(`✅ ID ${record.id}에서 Storage URL 발견: ${targetUrl}`);
                    break;
                }
            }
        } catch (e) {
            // Ignore parse errors for individual records
        }
    }

    if (!targetUrl) {
        console.log("⚠️ 최근 20개 기록에서 Storage URL을 찾을 수 없습니다.");
        process.exit(0);
    }

    console.log(`🔗 발견된 URL: ${targetUrl}`);
    console.log("🌐 연결 테스트 중...");

    exec(`curl -I -s "${targetUrl}"`, (error, stdout, stderr) => {
        if (error) {
            console.log(`❌ 연결 실패: ${error.message}`);
            return;
        }

        if (stdout.includes("200 OK")) {
            console.log("\n🎉 [검증 성공] 파일 서버 연결 정상 (200 OK)");
            console.log("✅ Supabase Storage가 완벽하게 작동 중입니다.");
        } else {
            console.log(`\n⚠️ 응답 확인 필요:\n${stdout}`);
        }
        process.exit(0);
    });
}

checkStorageConnection();
