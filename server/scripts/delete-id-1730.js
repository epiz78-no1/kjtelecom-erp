import pg from 'pg';
const { Client } = pg;

const DATABASE_URL = 'postgresql://postgres.cistmojmpevmufpxxeeq:chldhrwn7908%3F@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres';

async function deleteID1730() {
    const client = new Client({ connectionString: DATABASE_URL });

    try {
        await client.connect();
        console.log('✅ 데이터베이스 연결 성공\n');

        // 먼저 ID 1730 확인
        const check = await client.query(`SELECT * FROM inventory_items WHERE id = 1730`);

        if (check.rows.length === 0) {
            console.log('❌ ID 1730이 존재하지 않습니다. 삭제할 필요가 없습니다.');
            return;
        }

        console.log('🔍 삭제 대상:\n');
        console.log(`ID: ${check.rows[0].id}`);
        console.log(`품명: "${check.rows[0].product_name}"`);
        console.log(`재고: ${check.rows[0].remaining}`);
        console.log('');

        // 삭제 실행
        const result = await client.query(`DELETE FROM inventory_items WHERE id = 1730 RETURNING *`);

        if (result.rows.length > 0) {
            console.log('✅ ID 1730 삭제 완료!');
        } else {
            console.log('❌ 삭제 실패');
        }

    } catch (error) {
        console.error('❌ 오류:', error.message);
    } finally {
        await client.end();
    }
}

// 주석 해제하여 실행
// deleteID1730();

console.log('⚠️  이 스크립트는 안전을 위해 주석 처리되어 있습니다.');
console.log('삭제를 원하시면 마지막 줄의 주석을 해제하세요.');
