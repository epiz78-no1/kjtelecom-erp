// 운영 DB 철거자재 데이터 확인 스크립트
const { Client } = require('pg');

const client = new Client({
    connectionString: 'postgresql://postgres.ggyibpyypykpcqxmgbgt:chldhrwn7908?@aws-0-ap-northeast-2.pooler.supabase.com:5432/postgres',
    ssl: { rejectUnauthorized: false }
});

async function checkData() {
    try {
        await client.connect();
        console.log('✅ 운영 DB 연결 성공\n');

        // 1. 모든 테넌트 조회
        const tenantsResult = await client.query('SELECT id, name FROM tenants ORDER BY name');
        console.log('📊 전체 테넌트 목록:');
        tenantsResult.rows.forEach(t => {
            console.log(`  - ${t.name} (ID: ${t.id})`);
        });
        console.log('');

        // 2. 광주텔레콤 테넌트 ID 찾기
        const kjTenant = tenantsResult.rows.find(t => t.name.includes('광주') || t.name.includes('KJ'));
        if (!kjTenant) {
            console.log('⚠️  광주텔레콤 테넌트를 찾을 수 없습니다!');
            return;
        }
        console.log(`🎯 광주텔레콤 테넌트: ${kjTenant.name} (ID: ${kjTenant.id})\n`);

        // 3. 철거자재 데이터 조회
        const demolitionResult = await client.query(
            'SELECT * FROM demolition_materials WHERE tenant_id = $1 ORDER BY created_at DESC',
            [kjTenant.id]
        );

        console.log(`📦 광주텔레콤 철거자재 데이터: ${demolitionResult.rows.length}건\n`);

        if (demolitionResult.rows.length === 0) {
            console.log('⚠️  광주텔레콤에 등록된 철거자재 데이터가 없습니다!');
            console.log('');

            // 다른 테넌트의 데이터 확인
            const allDemolitionResult = await client.query(
                'SELECT dm.*, t.name as tenant_name FROM demolition_materials dm JOIN tenants t ON dm.tenant_id = t.id ORDER BY dm.created_at DESC LIMIT 10'
            );

            if (allDemolitionResult.rows.length > 0) {
                console.log('📋 다른 테넌트의 최근 철거자재 데이터:');
                allDemolitionResult.rows.forEach((row, idx) => {
                    console.log(`  ${idx + 1}. [${row.tenant_name}] ${row.product_name} - ${row.specification || '규격없음'}`);
                    console.log(`     등록일: ${row.created_at}, 수량: ${row.original_quantity}`);
                });
            } else {
                console.log('❌ 전체 시스템에 철거자재 데이터가 하나도 없습니다!');
            }
        } else {
            console.log('✅ 광주텔레콤 철거자재 데이터 목록:');
            demolitionResult.rows.forEach((row, idx) => {
                console.log(`  ${idx + 1}. ${row.product_name} - ${row.specification || '규격없음'}`);
                console.log(`     공사: ${row.project_name} (${row.project_code})`);
                console.log(`     수량: 원수량 ${row.original_quantity}, 잔량 ${row.remaining_quantity}`);
                console.log(`     상태: ${row.status}, 등록일: ${row.demolition_date}`);
                console.log('');
            });
        }

    } catch (error) {
        console.error('❌ 오류 발생:', error.message);
    } finally {
        await client.end();
    }
}

checkData();
