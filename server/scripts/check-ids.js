import pg from 'pg';
const { Client } = pg;

const DATABASE_URL = 'postgresql://postgres.cistmojmpevmufpxxeeq:chldhrwn7908%3F@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres';

async function checkIDs() {
    const client = new Client({ connectionString: DATABASE_URL });

    try {
        await client.connect();
        console.log('✅ 데이터베이스 연결 성공\n');

        // ID 1703, 1730 조회
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
            WHERE id IN (1703, 1730, 1261)
            ORDER BY id
        `);

        console.log(`🔍 조회 결과 (${result.rows.length}개):\n`);
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

        // E-Type 함체 전체 조회
        const eTypeResult = await client.query(`
            SELECT id, product_name, specification, remaining
            FROM inventory_items
            WHERE LOWER(product_name) LIKE '%e-type%'
               AND product_name LIKE '%함체%'
            ORDER BY id
        `);

        console.log(`\n📊 E-Type 함체 전체: ${eTypeResult.rows.length}개\n`);
        eTypeResult.rows.forEach((item, idx) => {
            console.log(`[${idx + 1}] ID: ${item.id}, 품명: "${item.product_name}", 재고: ${item.remaining}`);
        });

    } catch (error) {
        console.error('❌ 오류:', error.message);
    } finally {
        await client.end();
    }
}

checkIDs();
