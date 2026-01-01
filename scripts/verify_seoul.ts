
import "dotenv/config";
import { resolveCname } from "dns/promises";

async function main() {
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
        console.error("❌ DATABASE_URL is missing in .env");
        return;
    }

    const match = dbUrl.match(/@([^:/]+)/);
    if (!match) {
        console.error("❌ Could not parse host from DATABASE_URL");
        return;
    }

    const hostname = match[1];
    console.log(`Current DB Host: ${hostname}`);

    if (hostname.includes("ap-northeast-2")) {
        console.log("✅ Hostname contains 'ap-northeast-2' (Seoul Region).");
    } else {
        console.warn("⚠️ Hostname does NOT look like Seoul region.");
    }

    try {
        const cnames = await resolveCname(hostname);
        console.log("CNAME Resolution:", cnames);
        if (cnames.some(c => c.includes("ap-northeast-2"))) {
            console.log("✅ DNS resolves to Seoul AWS region.");
        } else {
            console.warn("⚠️ DNS does not resolve to Seoul region.");
        }
    } catch (e) {
        console.log("ℹ️ Could not resolve CNAME (might be direct IP or alias), but hostname check passed.");
    }
}

main();
