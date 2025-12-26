const API_URL = 'http://localhost:5001';

async function verifyApi() {
    console.log('API 검증 시작 (Fetch & Debug)...');

    try {
        const loginRes = await fetch(`${API_URL}/api/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: 'user1', password: 'admin' })
        });

        if (!loginRes.ok) throw new Error(`로그인 실패: ${loginRes.status}`);

        const cookie = loginRes.headers.get('set-cookie');
        console.log('로그인 성공.');

        const inventoryData = {
            division: "SKT",
            category: "SKT",
            productName: "API 테스트 자재 3",
            type: "general",
            attributes: "{}",
            specification: "100mm",
            carriedOver: 0,
            incoming: 10,
            outgoing: 0,
            remaining: 10,
            unitPrice: 5000,
            totalAmount: 50000
        };

        const res = await fetch(`${API_URL}/api/inventory`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Cookie': cookie || ''
            },
            body: JSON.stringify(inventoryData)
        });

        const data: any = await res.json();

        if (res.status === 201) {
            console.log('성공! 재고가 추가되었습니다.');
        } else {
            console.log('실패! 상태 코드:', res.status);
            console.log('기대되는 키 (Expected Keys):', data.expectedKeys);
            console.log('검증 오류 상세 (Details):', JSON.stringify(data.details, null, 2));
            console.log('서버가 받은 데이터 (Received Body):', JSON.stringify(data.receivedBody, null, 2));
        }

    } catch (error: any) {
        console.error('오류 발생:', error.message);
    }
}

verifyApi();
