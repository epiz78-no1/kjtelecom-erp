async function verify() {
    const baseUrl = 'http://localhost:5001';
    let cookieHeader = '';

    async function api(path, method = 'GET', body = null) {
        const res = await fetch(`${baseUrl}${path}`, {
            method,
            headers: {
                'Content-Type': 'application/json',
                'Cookie': cookieHeader
            },
            body: body ? JSON.stringify(body) : null
        });

        const setCookie = res.headers.get('set-cookie');
        if (setCookie) {
            cookieHeader = setCookie.split(';')[0];
        }

        // Check if it's HTML (Vite proxy)
        const contentType = res.headers.get('content-type');
        if (contentType && contentType.includes('text/html')) {
            const text = await res.text();
            throw new Error(`API Error ${res.status}: Returned HTML (is the server reloaded?)`);
        }

        if (!res.ok) {
            const error = await res.json().catch(() => ({ message: res.statusText }));
            throw new Error(`API Error ${res.status}: ${JSON.stringify(error)}`);
        }

        return res.json();
    }

    try {
        console.log("0. Calling Setup API...");
        await api('/api/setup-test-data', 'POST');
        console.log("   Setup Success!");

        console.log("1. Testing Login as 'admin'...");
        const authData = await api('/api/auth/login', 'POST', {
            email: 'admin',
            password: '123456'
        });
        console.log("   Login Success!");
        console.log("   Tenants found:", authData.tenants.map(t => t.name).join(', '));

        for (const tenant of authData.tenants) {
            console.log(`\n2. Testing Tenant: [${tenant.name}]`);

            // Switch tenant
            await api('/api/auth/switch-tenant', 'POST', { tenantId: tenant.id });
            console.log(`   Switched to ${tenant.name}`);

            // Verify admin endpoints
            console.log(`   Testing Admin Members API...`);
            const members = await api('/api/admin/members');
            console.log(`   Success: Found ${members.length} member(s)`);
        }

        console.log("\n[SUCCESS] Multi-tenant Admin verification completed!");
    } catch (error) {
        console.error("\n[FAILED] Verification error:", error.message);
        process.exit(1);
    }
}

verify();
