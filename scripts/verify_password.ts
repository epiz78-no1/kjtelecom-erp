
const BASE_URL = "http://localhost:5001";
const USERNAME = "user1";
const ORIGINAL_PASSWORD = "123456";
const NEW_PASSWORD = "1234567";

let cookie = "";

async function login(password: string, expectSuccess: boolean) {
    console.log(`[TEST] Logging in with password: ${password}...`);
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            ...(cookie ? { Cookie: cookie } : {}),
        },
        body: JSON.stringify({ username: USERNAME, password }),
    });

    if (expectSuccess) {
        if (res.ok) {
            console.log("  -> Login Successful");
            const setCookie = res.headers.get("set-cookie");
            if (setCookie) {
                cookie = setCookie.split(";")[0];
            }
        } else {
            console.error("  -> Login Failed (Unexpected)", await res.text());
            process.exit(1);
        }
    } else {
        if (!res.ok) {
            console.log("  -> Login Failed (Expected)");
        } else {
            console.error("  -> Login Succeeded (Unexpected)");
            process.exit(1);
        }
    }
}

async function changePassword(currentPassword: string, newPassword: string) {
    console.log(`[TEST] Changing password from ${currentPassword} to ${newPassword}...`);
    const res = await fetch(`${BASE_URL}/api/auth/change-password`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Cookie: cookie,
        },
        body: JSON.stringify({ currentPassword, newPassword }),
    });

    if (res.ok) {
        console.log("  -> Password Change Successful");
    } else {
        console.error("  -> Password Change Failed", await res.text());
        process.exit(1);
    }
}

async function run() {
    try {
        console.log("Starting Password Change Verification for user1...");

        // 1. Initial Login
        await login(ORIGINAL_PASSWORD, true);

        // 2. Change Password to NEW
        await changePassword(ORIGINAL_PASSWORD, NEW_PASSWORD);

        // 3. Verify Old Password Fails
        console.log("[TEST] Verifying Old Password fails...");
        await login(ORIGINAL_PASSWORD, false);

        // 4. Verify New Password Works
        console.log("[TEST] Verifying New Password works...");
        await login(NEW_PASSWORD, true);

        // 5. Revert Password
        console.log("[TEST] Reverting password...");
        await changePassword(NEW_PASSWORD, ORIGINAL_PASSWORD);

        // 6. Verify Revert
        console.log("[TEST] Verifying Reverted Password works...");
        await login(ORIGINAL_PASSWORD, true);

        console.log("\n✅ All verifications passed successfully!");
    } catch (e) {
        console.error("Test execution failed", e);
        process.exit(1);
    }
}

run();
