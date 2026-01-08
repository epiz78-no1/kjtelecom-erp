import pg from 'pg';
const { Client } = pg;

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres.cistmojmpevmufpxxeeq:chldhrwn7908%3F@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres';

async function checkSchema() {
    const client = new Client({ connectionString: DATABASE_URL });

    try {
        await client.connect();
        console.log('✅ 데이터베이스 연결 성공\n');

        // 모든 테이블 조회
        console.log('🔍 데이터베이스 테이블 목록:\n');
        const tables = await client.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
            ORDER BY table_name
        `);

        tables.rows.forEach((table, idx) => {
            console.log(`[${idx + 1}] ${table.table_name}`);
        });
        console.log('');

        // user 관련 테이블 찾기
        console.log('\n🔍 User/Member 관련 테이블:\n');
        const userTables = tables.rows.filter(t =>
            t.table_name.includes('user') ||
            t.table_name.includes('member') ||
            t.table_name.includes('tenant')
        );

        for (const table of userTables) {
            console.log(`\n📋 ${table.table_name} 테이블 스키마:`);
            const schema = await client.query(`
                SELECT column_name, data_type 
                FROM information_schema.columns 
                WHERE table_name = $1
                ORDER BY ordinal_position
            `, [table.table_name]);

            schema.rows.forEach(col => {
                console.log(`   - ${col.column_name} (${col.data_type})`);
            });
        }

    } catch (error) {
        console.error('❌ 오류:', error.message);
    } finally {
        await client.end();
    }
}

checkSchema();
