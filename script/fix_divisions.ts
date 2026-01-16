
import "dotenv/config";
import { db } from "../server/db";
import { divisions, teams } from "@shared/schema";
import { eq, or, desc } from "drizzle-orm";

async function main() {
    console.log("Starting division fix...");
    const tenantId = "68054a8d-c82b-4c98-80b7-13e669830f18"; // Known tenant ID from previous output

    // 1. Get existing divisions
    const allDivisions = await db.select().from(divisions).where(eq(divisions.tenantId, tenantId));
    console.log("Current divisions:", allDivisions.map(d => d.name));

    // 2. Identify target divisions (SKT, SKB)
    let sktDiv = allDivisions.find(d => d.name === "SKT사업부" || d.name === "SKT");
    let skbDiv = allDivisions.find(d => d.name === "SKB사업부" || d.name === "SKB");

    // Create if missing
    if (!sktDiv) {
        console.log("Creating SKT Division...");
        [sktDiv] = await db.insert(divisions).values({
            tenantId,
            name: "SKT사업부"
        }).returning();
    }
    if (!skbDiv) {
        console.log("Creating SKB Division...");
        [skbDiv] = await db.insert(divisions).values({
            tenantId,
            name: "SKB사업부"
        }).returning();
    }

    // 3. Identify incorrect divisions
    const incorrectDivNames = ["접속팀", "외선팀"];
    const incorrectDivs = allDivisions.filter(d => incorrectDivNames.includes(d.name));

    if (incorrectDivs.length === 0) {
        console.log("No incorrect divisions found.");
    } else {
        // 4. Move teams to SKT (default safe place)
        for (const div of incorrectDivs) {
            console.log(`Processing incorrect division: ${div.name}`);
            const teamsInDiv = await db.select().from(teams).where(eq(teams.divisionId, div.id));

            for (const team of teamsInDiv) {
                console.log(`Moving team '${team.name}' from '${div.name}' to '${sktDiv!.name}'`);
                await db.update(teams)
                    .set({ divisionId: sktDiv!.id })
                    .where(eq(teams.id, team.id));
            }

            // 5. Delete incorrect division
            console.log(`Deleting division: ${div.name}`);
            await db.delete(divisions).where(eq(divisions.id, div.id));
        }
    }

    console.log("Fix completed successfully.");
    process.exit(0);
}

main().catch(console.error);
