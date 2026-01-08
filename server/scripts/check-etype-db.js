import pg from 'pg';
const { Client } = pg;

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres.cistmojmpevmufpxxeeq:chldhrwn7908%3F@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres';

async function checkEType() {
    const client = new Client({ connectionString: DATABASE_URL });

    try {
        await client.connect();
        console.log('✅ 데이터베이스 연결 성공\n');

        // E-Type 함체 모든 항목 조회
        console.log('🔍 E-Type 함체 전체 조회 중...\n');
        const resultAll = await client.query(`
            SELECT * FROM inventory_items
            WHERE product_name LIKE '%Type%'
               OR product_name LIKE '%함체%'
            ORDER BY id
        `);

        console.log(`총 ${resultAll.rows.length}개 항목 발견:\n`);
        resultAll.rows.forEach((item, idx) => {
            console.log(`[${idx + 1}] ID: ${item.id}`);
            console.log(`    품명: "${item.product_name}" (길이: ${item.product_name.length})`);
            console.log(`    규격: "${item.specification}" (길이: ${item.specification.length})`);
            console.log(`    사업: "${item.division}" (길이: ${item.division.length})`);
            console.log(`    재고: ${item.remaining}`);
            console.log(`    단가: ${item.unit_price}`);
            console.log(`    금액: ${item.total_amount}`);

            // 공백 체크
            const trimmedName = item.product_name.trim();
            const trimmedSpec = item.specification.trim();
            const trimmedDiv = item.division.trim();

            if (item.product_name !== trimmedName ||
                item.specification !== trimmedSpec ||
                item.division !== trimmedDiv) {
                console.log(`    ⚠️  공백 발견!`);
                if (item.product_name !== trimmedName) {
                    console.log(`       - 품명: "${item.product_name}" → "${trimmedName}"`);
                }
                if (item.specification !== trimmedSpec) {
                    console.log(`       - 규격: "${item.specification}" → "${trimmedSpec}"`);
                }
                if (item.division !== trimmedDiv) {
                    console.log(`       - 사업: "${item.division}" → "${trimmedDiv}"`);
                }
            }
            console.log('');
        });

        // 중복 체크
        console.log('\n📊 중복 분석:\n');
        const groups = new Map();
        resultAll.rows.forEach(item => {
            const key = `${item.product_name.trim()}|${item.specification.trim()}|${item.division.trim()}`;
            if (!groups.has(key)) {
                groups.set(key, []);
            }
            groups.get(key).push(item);
        });

        groups.forEach((items, key) => {
            if (items.length > 1) {
                console.log(`⚠️  중복 발견: "${key}"`);
                console.log(`   총 ${items.length}개 항목:`);
                items.forEach(item => {
                    console.log(`   - ID ${item.id}: 재고 ${item.remaining}, 금액 ${item.total_amount}`);
                });
                console.log('');
            }
        });

        // 입고 내역 확인
        console.log('\n📥 E-Type 함체 입고 내역 조회 중...\n');
        const resultIncoming = await client.query(`
            SELECT * FROM incoming_records
            WHERE product_name LIKE '%Type%'
               OR product_name LIKE '%함체%'
            ORDER BY id DESC
            LIMIT 20
        `);

        console.log(`최근 ${resultIncoming.rows.length}개 입고 내역:\n`);
        resultIncoming.rows.forEach((item, idx) => {
            console.log(`[${idx + 1}] ID: ${item.id}`);
            console.log(`    품명: "${item.product_name}"`);
            console.log(`    규격: "${item.specification}"`);
            console.log(`    수량: ${item.quantity}`);
            console.log(`    입고일: ${item.date}`);
            console.log(`    등록자: ${item.created_by}`);
            console.log('');
        });

    } catch (error) {
        console.error('❌ 오류:', error.message);
        console.error(error.stack);
    } finally {
        await client.end();
    }
}

checkEType();
