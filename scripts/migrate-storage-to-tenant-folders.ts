import { createClient } from '@supabase/supabase-js';
import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import { tenants } from '../shared/schema.js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;
const databaseUrl = process.env.DATABASE_URL!;

if (!supabaseUrl || !supabaseServiceKey || !databaseUrl) {
    console.error('❌ 환경 변수가 설정되지 않았습니다.');
    console.error('   SUPABASE_URL:', supabaseUrl ? '✅' : '❌');
    console.error('   SUPABASE_SERVICE_KEY:', supabaseServiceKey ? '✅' : '❌');
    console.error('   DATABASE_URL:', databaseUrl ? '✅' : '❌');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

// PostgreSQL 연결
const pool = new pg.Pool({
    connectionString: databaseUrl,
});
const db = drizzle(pool);

/**
 * 기존 파일들을 테넌트별 폴더로 이동하는 마이그레이션 스크립트
 * 
 * 주의: 이 스크립트는 파일을 복사 후 삭제하는 방식으로 작동합니다.
 * 실행 전 반드시 백업을 권장합니다.
 */
async function migrateFilesToTenantFolders() {
    console.log('🚀 파일 마이그레이션 시작...\n');

    try {
        // 1. 모든 테넌트 조회
        const allTenants = await db.select().from(tenants);
        console.log(`📊 총 ${allTenants.length}개 테넌트 발견\n`);

        if (allTenants.length === 0) {
            console.log('⚠️  테넌트가 없습니다. 마이그레이션을 중단합니다.');
            return;
        }

        // 2. attachments 버킷의 모든 파일 조회
        const { data: files, error: listError } = await supabase.storage
            .from('attachments')
            .list('', {
                limit: 10000,
                sortBy: { column: 'name', order: 'asc' }
            });

        if (listError) {
            throw new Error(`파일 목록 조회 실패: ${listError.message}`);
        }

        if (!files || files.length === 0) {
            console.log('✅ 이동할 파일이 없습니다.');
            return;
        }

        console.log(`📁 총 ${files.length}개 파일 발견\n`);

        // 3. 이미 폴더 구조에 있는 파일 필터링 (tenantId/filename 형식)
        const rootFiles = files.filter(file => !file.name.includes('/'));
        console.log(`📦 루트에 있는 파일: ${rootFiles.length}개`);
        console.log(`📂 이미 폴더에 있는 파일: ${files.length - rootFiles.length}개\n`);

        if (rootFiles.length === 0) {
            console.log('✅ 모든 파일이 이미 테넌트 폴더에 있습니다.');
            return;
        }

        // 4. 첫 번째 테넌트 폴더로 모든 루트 파일 이동
        const defaultTenant = allTenants[0];
        console.log(`🎯 모든 루트 파일을 "${defaultTenant.name}" (${defaultTenant.id}) 폴더로 이동합니다.\n`);

        let successCount = 0;
        let errorCount = 0;

        for (const file of rootFiles) {
            const oldPath = file.name;
            const newPath = `${defaultTenant.id}/${file.name}`;

            try {
                // 파일 복사
                const { error: copyError } = await supabase.storage
                    .from('attachments')
                    .copy(oldPath, newPath);

                if (copyError) {
                    console.error(`❌ 복사 실패 (${oldPath}): ${copyError.message}`);
                    errorCount++;
                    continue;
                }

                // 원본 파일 삭제
                const { error: deleteError } = await supabase.storage
                    .from('attachments')
                    .remove([oldPath]);

                if (deleteError) {
                    console.error(`⚠️  삭제 실패 (${oldPath}): ${deleteError.message}`);
                    console.log(`   → 파일은 복사되었지만 원본이 남아있습니다.`);
                }

                successCount++;
                console.log(`✅ ${oldPath} → ${newPath}`);

            } catch (error: any) {
                console.error(`❌ 이동 실패 (${oldPath}): ${error.message}`);
                errorCount++;
            }
        }

        console.log(`\n📊 마이그레이션 완료!`);
        console.log(`   성공: ${successCount}개`);
        console.log(`   실패: ${errorCount}개`);

    } catch (error: any) {
        console.error('❌ 마이그레이션 중 오류 발생:', error);
        throw error;
    } finally {
        await pool.end();
    }
}

// 스크립트 실행
migrateFilesToTenantFolders()
    .then(() => {
        console.log('\n✅ 마이그레이션 스크립트 완료');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n❌ 마이그레이션 실패:', error);
        process.exit(1);
    });
