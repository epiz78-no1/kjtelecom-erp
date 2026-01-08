import pg from 'pg';
const { Client } = pg;

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres.cistmojmpevmufpxxeeq:chldhrwn7908%3F@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres';

async function checkETypeDuplicates() {
    const client = new Client({ connectionString: DATABASE_URL });

    try {
        await client.connect();
        console.log('✅ 데이터베이스 연결 성공\n');

        // E-Type 함체 조회
        console.log('🔍 E-Type 함체 조회 중...\n');
        const result = await client.query(`
            SELECT 
                id,
                product_name,
                specification,
                division,
                remaining,
                unit_price,
                total_amount,
                LENGTH(product_name) as name_length
            FROM inventory_items
            WHERE product_name LIKE '%Type%'
               OR product_name LIKE '%함체%'
            ORDER BY id
        `);

        console.log(`총 ${result.rows.length}개 항목:\n`);
        result.rows.forEach((item, idx) => {
            console.log(`[${idx + 1}] ID: ${item.id}`);
            console.log(`    품명: "${item.product_name}" (길이: ${item.name_length})`);
            console.log(`    규격: "${item.specification}"`);
            console.log(`    사업: "${item.division}"`);
            console.log(`    재고: ${item.remaining}`);
            console.log(`    단가: ${item.unit_price}`);
            console.log(`    금액: ${item.total_amount}`);

            // 공백 체크
            if (item.product_name !== item.product_name.trim()) {
                console.log(`    ⚠️  품명에 공백 있음!`);
            }
            console.log('');
        });

        // E-Type 함체만 필터링
        const eTypeItems = result.rows.filter(r =>
            r.product_name.toLowerCase().includes('e-type') &&
            r.product_name.includes('함체')
        );

        console.log(`\n📊 E-Type 함체 항목: ${eTypeItems.length}개\n`);
        eTypeItems.forEach((item, idx) => {
            console.log(`[${idx + 1}] ID: ${item.id}, 재고: ${item.remaining}, 품명: "${item.product_name}"`);
        });

        if (eTypeItems.length > 1) {
            console.log('\n⚠️  E-Type 함체가 중복되어 있습니다!');
        }

    } catch (error) {
        console.error('❌ 오류:', error.message);
    } finally {
        await client.end();
    }
}

checkETypeDuplicates();
