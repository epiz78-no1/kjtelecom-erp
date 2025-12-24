import { db } from "../server/db";
import * as schema from "../shared/schema";
import { eq, and } from "drizzle-orm";
import { migrate } from "drizzle-orm/pglite/migrator";
import path from "path";
import bcrypt from "bcrypt";

const SALT_ROUNDS = 10;

async function seed() {
    console.log("Seeding test data...");

    try {
        // 0. Migrate database
        console.log("Running migrations...");
        // migrationsFolder는 프로젝트 루트 기준
        await migrate(db, { migrationsFolder: "./migrations" });
        console.log("Migrations completed.");

        // 1. Create Admin User
        const adminEmail = "admin";
        const adminPassword = "123456";
        const hashedPassword = await bcrypt.hash(adminPassword, SALT_ROUNDS);

        let adminUser = await db.query.users.findFirst({
            where: eq(schema.users.email, adminEmail)
        });

        if (!adminUser) {
            const [result] = await db.insert(schema.users).values({
                email: adminEmail,
                password: hashedPassword,
                name: "최고관리자"
            }).returning();
            adminUser = result;
            console.log("Created admin user: admin / 123456");
        } else {
            // Update password just in case
            await db.update(schema.users)
                .set({ password: hashedPassword })
                .where(eq(schema.users.id, adminUser.id));
            console.log("Updated existing admin user password");
        }

        // 2. Create Tenants
        const companies = ["광텔", "한주통신"];
        for (const companyName of companies) {
            let tenant = await db.query.tenants.findFirst({
                where: eq(schema.tenants.name, companyName)
            });

            if (!tenant) {
                const slug = companyName.toLowerCase().replace(/[^ㄱ-ㅎㅏ-ㅣ가-힣a-z0-9]+/g, '-');
                const [result] = await db.insert(schema.tenants).values({
                    name: companyName,
                    slug: slug + "-" + Date.now(),
                    isActive: true
                }).returning();
                tenant = result;
                console.log(`Created tenant: ${companyName}`);
            }

            // 3. Link Admin to Tenant as owner
            const existingLink = await db.query.userTenants.findFirst({
                where: and(
                    eq(schema.userTenants.userId, adminUser.id),
                    eq(schema.userTenants.tenantId, tenant.id)
                )
            });

            if (!existingLink) {
                await db.insert(schema.userTenants).values({
                    userId: adminUser.id,
                    tenantId: tenant.id,
                    role: "owner",
                    status: "active"
                });
                console.log(`Linked admin to ${companyName} as owner`);
            }
        }

        console.log("Seeding completed successfully!");
        process.exit(0);
    } catch (error) {
        console.error("Seeding failed:", error);
        process.exit(1);
    }
}

seed();
