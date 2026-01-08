import pg from 'pg';
const { Client } = pg;

// 운영 서버 DATABASE_URL 직접 사용
const DATABASE_URL = 'postgresql://postgres.cistmojmpevmufpxxeeq:chldhrwn7908%3F@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres';

async function checkAllEType() {
    const client = new Client({ connectionString: DATABASE_URL });

    try {
        await client.connect();
        console.log('✅ 운영 서버 데이터베이스 연결 성공\n');

        // 모든 E-Type 함체 조회 (공백 포함)
        const result = await client.query(`
            SELECT 
                id,
                product_name,
                specification,
                division,
                remaining,
                unit_price,
                total_amount
            FROM inventory_items
            WHERE LOWER(product_name) LIKE '%e-type%'
               AND product_name LIKE '%함체%'
            ORDER BY id
        `);

        console.log(`🔍 E-Type 함체 총 ${result.rows.length}개:\n`);
        result.rows.forEach((item, idx) => {
            console.log(`[${idx + 1}] ID: ${item.id}`);
            console.log(`    품명: "${item.product_name}"`);
            console.log(`    규격: "${item.specification}"`);
            console.log(`    사업: "${item.division}"`);
            console.log(`    재고: ${item.remaining}`);
            console.log(`    단가: ${item.unit_price}`);
            console.log(`    금액: ${item.total_amount}`);
            console.log('');
        });

        if (result.rows.length > 1) {
            console.log('⚠️  중복 발견! 삭제할 항목을 확인하세요.');
            console.log('\n추천: 재고가 0인 항목을 삭제하는 것이 안전합니다.');
        }

    } catch (error) {
        console.error('❌ 오류:', error.message);
        console.error(error.stack);
    } finally {
        await client.end();
    }
}

checkAllEType();
