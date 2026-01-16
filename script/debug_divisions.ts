
import "dotenv/config";
import { db } from "../server/db";
import { divisions, teams } from "@shared/schema";
import { eq } from "drizzle-orm";

async function main() {

    console.log("Checking Teams...");
    const allTeams = await db.select().from(teams);
    console.log(JSON.stringify(allTeams.slice(0, 3), null, 2));

    console.log("Checking Divisions...");
    const allDivisions = await db.select().from(divisions);
    console.log(JSON.stringify(allDivisions, null, 2));

    process.exit(0);
}

main().catch(console.error);
