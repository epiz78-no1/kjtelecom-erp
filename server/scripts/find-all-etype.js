import pg from 'pg';
const { Client } = pg;

const DATABASE_URL = 'postgresql://postgres.cistmojmpevmufpxxeeq:chldhrwn7908%3F@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres';

async function findAllEType() {
    const client = new Client({ connectionString: DATABASE_URL });

    try {
        await client.connect();
        console.log('✅ 데이터베이스 연결 성공\n');

        // 모든 E-Type 함체 조회 (대소문자 구분 없이)
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
            WHERE product_name ILIKE '%e%type%함체%'
               OR product_name ILIKE '%e-type%'
            ORDER BY id
        `);

        console.log(`🔍 E-Type 관련 항목: ${result.rows.length}개\n`);
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

        // 재고 0인 항목 찾기
        const zeroStock = result.rows.filter(r => r.remaining === 0);
        if (zeroStock.length > 0) {
            console.log(`\n⚠️  재고 0인 항목 (${zeroStock.length}개):`);
            zeroStock.forEach(item => {
                console.log(`   ID: ${item.id}, 품명: "${item.product_name}"`);
            });
        }

    } catch (error) {
        console.error('❌ 오류:', error.message);
        console.error(error.stack);
    } finally {
        await client.end();
    }
}

findAllEType();
