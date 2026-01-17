
// Native fetch is available in Node 18+

async function verifyDownload() {
    const bucket = 'attachments';
    // Simulate a file with spaces and special characters, as seen in user's screenshots
    // URL encoded version of "folder/스크린샷 2026-01-17 (1).png"
    const mockStorageUrl = `https://example.supabase.co/storage/v1/object/public/${bucket}/folder/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202026-01-17%20(1).png`;
    const mockFileName = "스크린샷 2026-01-17 (1).png";

    console.log("1. Simulating Client Logic...");

    let path = '';
    try {
        const urlObj = new URL(mockStorageUrl);
        const pathName = urlObj.pathname;

        console.log("   - URL Pathname:", pathName);

        if (pathName.includes(`/${bucket}/`)) {
            const parts = pathName.split(`/${bucket}/`);
            if (parts.length > 1) {
                // The Fix: decodeURIComponent
                path = decodeURIComponent(parts[1]);
                console.log("   - Extracted Path (Decoded):", path);
            }
        }
    } catch (e) {
        console.error("   - Client Logic Error:", e);
        return;
    }

    if (!path) {
        console.error("❌ Failed to extract path!");
        return;
    }

    const proxyUrl = `http://localhost:5001/api/storage/proxy-download?bucket=${bucket}&path=${encodeURIComponent(path)}&filename=${encodeURIComponent(mockFileName)}`;
    console.log("   - Constructed Proxy URL:", proxyUrl);

    console.log("\n2. Testing Server Response...");
    try {
        // Note: You might need a valid cookie for real auth, but we'll check if it hits the server 
        // and if it fails with 500 (crash) or 401 (auth) or 200 (success).
        // Since we restarted server with manual encoding, 500 should be gone.
        // We can't easily bypass auth 401 without a real cookie, but we can check if it CRASHES.
        // If it returns 401, it means it parsed parameters successfully and reached auth check.
        // If it returns 500, it crashed.

        // However, to verify HEADERS, we need 200.
        // Let's use the test-download endpoint for header verification if auth blocks us.

        console.log("   - Sending Request (expecting 401 or 200)...");
        const res = await fetch(proxyUrl);
        console.log("   - Status:", res.status, res.statusText);

        if (res.status === 500) {
            console.error("❌ Server Error (500)! The fix failed.");
            const text = await res.text();
            console.error("   - Error details:", text);
        } else if (res.status === 401) {
            console.log("✅ Server reachable (401 Unauthorized expected without cookie). Parameter parsing likely succeeded.");
        } else if (res.status === 200) {
            console.log("✅ Success (200 OK)!");
            const disposition = res.headers.get('content-disposition');
            console.log("   - Content-Disposition:", disposition);

            if (disposition?.includes(`filename*=UTF-8''`)) {
                console.log("✅ Header format is RFC 5987 compliant.");
            } else {
                console.error("❌ Header format is missing UTF-8 encoding.");
            }
        }
    } catch (e) {
        console.error("❌ Network Error:", e);
    }

    console.log("\n3. Testing Header Logic specifically (via test-download endpoint)...");
    try {
        const testRes = await fetch('http://localhost:5001/api/storage/test-download');
        const disposition = testRes.headers.get('content-disposition');
        console.log("   - Test Endpoint Disposition:", disposition);

        // Manual check of the header string for known Korean characters
        if (disposition?.includes('%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7')) { // "스크린샷" encoded
            console.log("✅ Korean characters encoded correctly.");
        }
    } catch (e) {
        console.error("❌ Test Endpoint Error:", e);
    }
}

verifyDownload();
