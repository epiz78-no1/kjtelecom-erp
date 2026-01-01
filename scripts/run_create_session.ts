
import "dotenv/config";
import { pool } from "../server/db";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
    console.log("Creating 'session' table...");
    const sqlContent = fs.readFileSync(path.join(__dirname, "create_session_table.sql"), "utf-8");
    try {
        await pool.query(sqlContent);
        console.log("Session table created successfully.");
    } catch (error) {
        if (error.code === '42P07') {
            console.log("Session table already exists.");
        } else {
            console.error("Error creating session table:", error);
        }
    } finally {
        await pool.end();
    }
}
main();
