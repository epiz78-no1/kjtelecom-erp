import pg from 'pg';
const { Client } = pg;

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres.cistmojmpevmufpxxeeq:chldhrwn7908%3F@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres';

async function checkOrgData() {
    const client = new Client({ connectionString: DATABASE_URL });

    try {
        await client.connect();
        console.log('✅ 데이터베이스 연결 성공\n');

        // 1. Divisions 조회
        console.log('🔍 Divisions 조회 중...\n');
        const divisions = await client.query(`SELECT * FROM divisions ORDER BY id`);
        console.log(`총 ${divisions.rows.length}개 사업부:\n`);
        divisions.rows.forEach((div, idx) => {
            console.log(`[${idx + 1}] ID: ${div.id}, Name: "${div.name}"`);
        });

        // 2. Teams 조회
        console.log('\n🔍 Teams 조회 중...\n');
        const teams = await client.query(`
            SELECT t.*, d.name as division_name
            FROM teams t
            LEFT JOIN divisions d ON t.division_id = d.id
            ORDER BY t.id
        `);
        console.log(`총 ${teams.rows.length}개 팀:\n`);
        teams.rows.forEach((team, idx) => {
            console.log(`[${idx + 1}] ID: ${team.id}`);
            console.log(`    Name: "${team.name}"`);
            console.log(`    Division: ${team.division_name || 'NULL'}`);
            console.log(`    Division ID: ${team.division_id || 'NULL'}`);
            console.log('');
        });

        // 3. User-Team 매핑 확인
        console.log('\n🔍 User-Team 매핑 조회 중...\n');
        const userTeams = await client.query(`
            SELECT 
                ut.id,
                u.name as user_name,
                u.username,
                ut.team_id,
                t.name as team_name,
                ut.division_id,
                d.name as division_name
            FROM user_tenants ut
            LEFT JOIN users u ON ut.user_id = u.id
            LEFT JOIN teams t ON ut.team_id = t.id
            LEFT JOIN divisions d ON ut.division_id = d.id
            WHERE ut.status = 'active'
            ORDER BY ut.id
        `);

        console.log(`총 ${userTeams.rows.length}개 활성 사용자:\n`);
        userTeams.rows.forEach((row, idx) => {
            console.log(`[${idx + 1}] ${row.user_name} (${row.username})`);
            console.log(`    Division: ${row.division_name || 'NULL'} (ID: ${row.division_id || 'NULL'})`);
            console.log(`    Team: ${row.team_name || 'NULL'} (ID: ${row.team_id || 'NULL'})`);
            console.log('');
        });

        // 4. 통계
        const withDivision = userTeams.rows.filter(r => r.division_id).length;
        const withTeam = userTeams.rows.filter(r => r.team_id).length;
        console.log('\n📊 통계:');
        console.log(`   사업부 할당: ${withDivision}/${userTeams.rows.length}명`);
        console.log(`   팀 할당: ${withTeam}/${userTeams.rows.length}명`);

    } catch (error) {
        console.error('❌ 오류:', error.message);
        console.error(error.stack);
    } finally {
        await client.end();
    }
}

checkOrgData();
