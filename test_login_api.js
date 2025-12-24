import fs from 'fs';

const testData = JSON.parse(fs.readFileSync('./test_register.json', 'utf8'));

async function testLoginFlow() {
    console.log("로그인 테스트 시작:", testData.email);

    // 1. 로그인 시도
    const loginRes = await fetch("http://localhost:5000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            email: testData.email,
            password: testData.password
        }),
    });

    console.log("로그인 Status:", loginRes.status);
    const loginBody = await loginRes.json();

    if (loginRes.status !== 200) {
        console.log("❌ 로그인 실패:", loginBody.error);
        return;
    }

    console.log("✅ 로그인 성공!");
    console.log("사용자:", loginBody.user.name);
    console.log("테넌트:", loginBody.tenants[0].name);

    // 세션 쿠키 추출 (Node.js fetch에서는 headers.get('set-cookie')로 확인 가능)
    const setCookie = loginRes.headers.get('set-cookie');

    // 2. 보호된 API (인벤토리) 조회 시도
    console.log("\n보호된 API (인벤토리) 조회 시도...");
    const invRes = await fetch("http://localhost:5000/api/inventory", {
        headers: {
            "Cookie": setCookie
        },
    });

    console.log("인벤토리 조회 Status:", invRes.status);
    if (invRes.status === 200) {
        const invData = await invRes.json();
        console.log("✅ API 접근 성공! 데이터 개수:", invData.length);
    } else {
        const errData = await invRes.text();
        console.log("❌ API 접근 실패:", errData);
    }
}

testLoginFlow().catch(console.error);
