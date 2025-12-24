
const BASE_URL = 'http://localhost:5000/api';

async function init() {
    console.log('--- 테스트 데이터 입력 시작 ---');

    // 1. 사업부 생성 (2개)
    const divs = [
        { id: 'DIV_SKT_TEST', name: 'SKT 테스트 사업부' },
        { id: 'DIV_SKB_TEST', name: 'SKB 테스트 사업부' }
    ];

    for (const div of divs) {
        const res = await fetch(`${BASE_URL}/divisions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(div)
        });
        console.log(`사업부 생성: ${div.name} (${res.status})`);
    }

    // 2. 팀 생성 (각 사업부 5개씩, 총 10개)
    const teams = [];
    for (let i = 1; i <= 5; i++) {
        teams.push({ name: `SKT 테스트 ${i}팀`, divisionId: 'DIV_SKT_TEST', teamCategory: i % 2 === 0 ? '접속팀' : '외선팀', memberCount: 5 + i });
        teams.push({ name: `SKB 테스트 ${i}팀`, divisionId: 'DIV_SKB_TEST', teamCategory: i % 2 === 0 ? '접속팀' : '외선팀', memberCount: 3 + i });
    }

    for (const team of teams) {
        const res = await fetch(`${BASE_URL}/teams`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(team)
        });
        console.log(`팀 생성: ${team.name} (${res.status})`);
    }

    // 3. 자재 생성 (10개)
    const materials = [];
    for (let i = 1; i <= 10; i++) {
        materials.push({
            division: i <= 5 ? 'SKT' : 'SKB',
            category: '케이블',
            productName: `테스트 광케이블 ${i}형`,
            specification: `${i * 12}C`,
            carriedOver: 100,
            incoming: 0,
            outgoing: 0,
            remaining: 100,
            unitPrice: 1000 * i,
            totalAmount: 100000 * i
        });
    }

    for (const item of materials) {
        const res = await fetch(`${BASE_URL}/inventory`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(item)
        });
        console.log(`자재 생성: ${item.productName} (${res.status})`);
    }

    // 4. 출고 기록 (10개)
    for (let i = 1; i <= 10; i++) {
        const record = {
            date: `2025-12-${10 + i}`,
            division: i <= 5 ? 'SKT' : 'SKB',
            teamCategory: '접속팀',
            projectName: `테스트 프로젝트 ${i}`,
            productName: `테스트 광케이블 ${i}형`,
            specification: `${i * 12}C`,
            quantity: 5,
            recipient: `테스트사용자${i}`
        };
        const res = await fetch(`${BASE_URL}/outgoing`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(record)
        });
        console.log(`출고 기록 생성 ${i} (${res.status})`);
    }

    // 5. 사용 기록 (10개)
    for (let i = 1; i <= 10; i++) {
        const record = {
            date: `2025-12-${10 + i}`,
            division: i <= 5 ? 'SKT' : 'SKB',
            teamCategory: '접속팀',
            projectName: `테스트 프로젝트 ${i}`,
            productName: `테스트 광케이블 ${i}형`,
            specification: `${i * 12}C`,
            quantity: 3,
            recipient: `테스트사용자${i}`
        };
        const res = await fetch(`${BASE_URL}/material-usage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(record)
        });
        console.log(`사용 기록 생성 ${i} (${res.status})`);
    }

    // 6. 입고 기록 (10개)
    for (let i = 1; i <= 10; i++) {
        const record = {
            date: `2025-12-${10 + i}`,
            division: i <= 5 ? 'SKT' : 'SKB',
            supplier: '테스트 공급사',
            projectName: '테스트 입고',
            productName: `테스트 광케이블 ${i}형`,
            specification: `${i * 12}C`,
            quantity: 50,
            unitPrice: 1000 * i
        };
        const res = await fetch(`${BASE_URL}/incoming`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(record)
        });
        console.log(`입고 기록 생성 ${i} (${res.status})`);
    }

    console.log('--- 테스트 데이터 입력 완료 ---');
}

init().catch(console.error);
