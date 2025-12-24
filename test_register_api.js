import fs from 'fs';

const testData = JSON.parse(fs.readFileSync('./test_register.json', 'utf8'));

console.log("회원가입 테스트 시작:", testData.email);

fetch("http://localhost:5000/api/auth/register", {
    method: "POST",
    headers: {
        "Content-Type": "application/json",
    },
    body: JSON.stringify(testData),
})
    .then(async (res) => {
        console.log("Status:", res.status);
        const body = await res.json();
        console.log("Response Body:", JSON.stringify(body, null, 2));
        
        if (res.status === 201) {
            console.log("✅ 회원가입 성공!");
        } else {
            console.log("❌ 회원가입 실패:", body.error || "알 수 없는 오류");
        }
    })
    .catch((err) => {
        console.error("Fetch Error:", err);
    });
