import pg from 'pg';
const { Client } = pg;

const DATABASE_URL = 'postgresql://postgres.cistmojmpevmufpxxeeq:chldhrwn7908%3F@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres';

async function findID1730() {
    const client = new Client({ connectionString: DATABASE_URL });

    try {
        await client.connect();
        console.log('✅ 데이터베이스 연결 성공\n');

        // ID 1730 직접 조회
        const result = await client.query(`
            SELECT 
                id,
                tenant_id,
                product_name,
                specification,
                division,
                category,
                remaining,
                unit_price
            FROM inventory_items
            WHERE id = 1730
        `);

        if (result.rows.length > 0) {
            console.log('🔍 ID 1730 발견!\n');
            const item = result.rows[0];
            console.log(`ID: ${item.id}`);
            console.log(`Tenant ID: ${item.tenant_id}`);
            console.log(`품명: "${item.product_name}"`);
            console.log(`규격: "${item.specification}"`);
            console.log(`사업: "${item.division}"`);
            console.log(`카테고리: "${item.category}"`);
            console.log(`재고: ${item.remaining}`);
            console.log(`단가: ${item.unit_price}`);
        } else {
            console.log('❌ ID 1730이 존재하지 않습니다.');
        }

        // ID 1703도 확인
        const result2 = await client.query(`
            SELECT 
                id,
                tenant_id,
                product_name,
                specification,
                remaining
            FROM inventory_items
            WHERE id = 1703
        `);

        if (result2.rows.length > 0) {
            console.log('\n🔍 ID 1703 발견!\n');
            const item = result2.rows[0];
            console.log(`ID: ${item.id}`);
            console.log(`Tenant ID: ${item.tenant_id}`);
            console.log(`품명: "${item.product_name}"`);
            console.log(`재고: ${item.remaining}`);
        }

    } catch (error) {
        console.error('❌ 오류:', error.message);
    } finally {
        await client.end();
    }
}

findID1730();
