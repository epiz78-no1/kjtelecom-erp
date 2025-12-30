
async function checkEndpoint() {
    try {
        console.log("Checking /api/members/basic...");
        // 404 = Endpoint doesn't exist (Server not updated)
        // 401 = Endpoint exists but needs auth (Server updated)
        const res = await fetch('http://localhost:5001/api/members/basic');
        console.log(`Status: ${res.status}`);
    } catch (error) {
        console.error("Error:", error.message);
    }
}

checkEndpoint();
