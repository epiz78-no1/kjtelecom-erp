
import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

async function listStorageFiles() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

    if (!supabaseUrl || !supabaseKey) {
        console.error("❌ SUPABASE_URL 또는 SUPABASE_SERVICE_KEY가 없습니다.");
        return;
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log("📡 Supabase Storage [attachments] 버킷 조회 중...");

    const { data, error } = await supabase
        .storage
        .from('attachments')
        .list('', {
            limit: 10,
            sortBy: { column: 'created_at', order: 'desc' },
        });

    if (error) {
        console.error("❌ 조회 실패:", error.message);
        console.error("🔍 상세 에러:", JSON.stringify(error, null, 2));
        return;
    }

    if (!data || data.length === 0) {
        console.log("📭 버킷이 비어있거나 파일을 찾을 수 없습니다.");
        return;
    }

    console.log(`\n✅ 총 ${data.length}개의 최신 파일을 찾았습니다:\n`);
    data.forEach((file, index) => {
        console.log(`${index + 1}. 📄 ${file.name}`);
        if (file.metadata) {
            console.log(`   - 크기: ${(file.metadata.size / 1024).toFixed(2)} KB`);
            console.log(`   - 생성일: ${new Date(file.created_at).toLocaleString()}`);
            // Construct public URL manually for display
            const publicUrl = `${supabaseUrl}/storage/v1/object/public/attachments/${file.name}`;
            console.log(`   - 🔗 링크: ${publicUrl}`);
        } else {
            console.log(`   - (폴더)`);
        }
        console.log("------------------------------------------------");
    });
}

listStorageFiles();
