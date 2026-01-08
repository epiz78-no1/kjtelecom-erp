import pg from 'pg';
const { Client } = pg;

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres.cistmojmpevmufpxxeeq:chldhrwn7908%3F@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres';

async function checkMembersTeams() {
    const client = new Client({ connectionString: DATABASE_URL });

    try {
        await client.connect();
        console.log('✅ 데이터베이스 연결 성공\n');

        // 1. Teams 조회
        console.log('🔍 Teams 조회 중...\n');
        const teamsResult = await client.query(`SELECT * FROM teams ORDER BY id LIMIT 10`);
        console.log(`총 ${teamsResult.rows.length}개 팀:\n`);
        teamsResult.rows.forEach((team, idx) => {
            console.log(`[${idx + 1}] ID: ${team.id}, Name: "${team.name}"`);
        });
        console.log('');

        // 2. Members 조회
        console.log('🔍 Members 조회 중...\n');
        const membersResult = await client.query(`SELECT * FROM members ORDER BY id LIMIT 20`);
        console.log(`총 ${membersResult.rows.length}개 멤버:\n`);
        membersResult.rows.forEach((member, idx) => {
            console.log(`[${idx + 1}] ID: ${member.id}`);
            console.log(`    Name: "${member.name}"`);
            console.log(`    Username: "${member.username}"`);
            console.log(`    TeamID: ${member.team_id || 'NULL'}`);
            console.log(`    Status: ${member.status}`);
            console.log('');
        });

        // 3. TeamID가 null인 멤버 확인
        const nullTeamMembers = await client.query(`
            SELECT id, name, username, team_id, status 
            FROM members 
            WHERE team_id IS NULL
        `);
        console.log(`\n⚠️  TeamID가 NULL인 멤버: ${nullTeamMembers.rows.length}개\n`);
        nullTeamMembers.rows.forEach((member, idx) => {
            console.log(`[${idx + 1}] ${member.name} (${member.username}) - Status: ${member.status}`);
        });

        // 4. 특정 팀의 멤버 조회 (첫 번째 팀)
        if (teamsResult.rows.length > 0) {
            const firstTeam = teamsResult.rows[0];
            console.log(`\n🔍 "${firstTeam.name}" 팀의 멤버 조회...\n`);
            const teamMembers = await client.query(`
                SELECT id, name, username, team_id, status
                FROM members
                WHERE team_id = $1
            `, [firstTeam.id]);

            console.log(`총 ${teamMembers.rows.length}개 멤버:\n`);
            teamMembers.rows.forEach((member, idx) => {
                console.log(`[${idx + 1}] ${member.name} (${member.username})`);
            });
        }

    } catch (error) {
        console.error('❌ 오류:', error.message);
        console.error(error.stack);
    } finally {
        await client.end();
    }
}

checkMembersTeams();
