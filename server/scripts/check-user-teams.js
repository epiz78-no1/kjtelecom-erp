import pg from 'pg';
const { Client } = pg;

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres.cistmojmpevmufpxxeeq:chldhrwn7908%3F@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres';

async function checkUserTeams() {
    const client = new Client({ connectionString: DATABASE_URL });

    try {
        await client.connect();
        console.log('✅ 데이터베이스 연결 성공\n');

        // user_tenants 조회
        console.log('🔍 user_tenants 조회 중...\n');
        const result = await client.query(`
            SELECT 
                ut.id,
                u.name as user_name,
                u.username,
                ut.team_id,
                t.name as team_name,
                ut.status
            FROM user_tenants ut
            LEFT JOIN users u ON ut.user_id = u.id
            LEFT JOIN teams t ON ut.team_id = t.id
            ORDER BY ut.id
        `);

        console.log(`총 ${result.rows.length}개 user_tenant:\n`);
        result.rows.forEach((row, idx) => {
            console.log(`[${idx + 1}] ${row.user_name} (${row.username})`);
            console.log(`    Team ID: ${row.team_id || 'NULL'}`);
            console.log(`    Team Name: ${row.team_name || 'NULL'}`);
            console.log(`    Status: ${row.status}`);
            console.log('');
        });

        // team_id가 NULL인 사용자
        const nullTeams = result.rows.filter(r => !r.team_id);
        console.log(`\n⚠️  Team ID가 NULL인 사용자: ${nullTeams.length}개\n`);
        nullTeams.forEach((row, idx) => {
            console.log(`[${idx + 1}] ${row.user_name} (${row.username}) - Status: ${row.status}`);
        });

    } catch (error) {
        console.error('❌ 오류:', error.message);
        console.error(error.stack);
    } finally {
        await client.end();
    }
}

checkUserTeams();
