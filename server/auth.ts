import type { Express, Request, Response } from "express";
import { db } from "./db";
import { users, tenants, userTenants } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import bcrypt from "bcrypt";

const SALT_ROUNDS = 10;

/**
 * Register authentication routes
 */
export function registerAuthRoutes(app: Express) {
    /**
     * POST /api/auth/register
     * Register a new user and create their tenant
     */
    app.post("/api/auth/register", async (req: Request, res: Response) => {
        try {
            const { username, password, name, companyName } = req.body;

            // Validate input
            if (!username || !password || !companyName) {
                return res.status(400).json({ error: "아이디, 비밀번호, 회사명은 필수입니다" });
            }

            // Check if user already exists
            const existingUser = await db.query.users.findFirst({
                where: eq(users.username, username)
            });

            if (existingUser) {
                return res.status(400).json({ error: "이미 존재하는 아이디입니다" });
            }

            // Hash password
            const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

            // Create user
            const [newUser] = await db.insert(users).values({
                username,
                password: hashedPassword,
                name: name || username
            }).returning();

            // Create tenant (slug from company name)
            const slug = companyName
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/^-|-$/g, '');

            const [newTenant] = await db.insert(tenants).values({
                name: companyName,
                slug: slug + '-' + Date.now(), // Add timestamp to ensure uniqueness
                isActive: true
            }).returning();

            // Link user to tenant as owner
            await db.insert(userTenants).values({
                userId: newUser.id,
                tenantId: newTenant.id,
                role: 'owner'
            });

            // Set session
            req.session.userId = newUser.id;
            req.session.tenantId = newTenant.id;

            res.status(201).json({
                user: {
                    id: newUser.id,
                    username: newUser.username,
                    name: newUser.name
                },
                tenant: {
                    id: newTenant.id,
                    name: newTenant.name,
                    slug: newTenant.slug
                }
            });
        } catch (error) {
            console.error("Registration error:", error);
            res.status(500).json({ error: "회원가입 중 오류가 발생했습니다" });
        }
    });

    /**
     * POST /api/auth/login
     * Login with email and password
     */
    app.post("/api/auth/login", async (req: Request, res: Response) => {
        try {
            const { username, password } = req.body;

            if (!username || !password) {
                return res.status(400).json({ error: "아이디와 비밀번호를 입력해주세요" });
            }

            // Find user
            const user = await db.query.users.findFirst({
                where: eq(users.username, username)
            });

            if (!user) {
                return res.status(401).json({ error: "아이디 또는 비밀번호가 올바르지 않습니다" });
            }

            // Verify password
            const isValid = await bcrypt.compare(password, user.password);
            if (!isValid) {
                return res.status(401).json({ error: "아이디 또는 비밀번호가 올바르지 않습니다" });
            }

            // Get user's tenants using join
            const userTenantsData = await db
                .select({
                    id: userTenants.id,
                    userId: userTenants.userId,
                    tenantId: userTenants.tenantId,
                    role: userTenants.role,
                    tenantName: tenants.name,
                    tenantSlug: tenants.slug,
                    tenantIsActive: tenants.isActive
                })
                .from(userTenants)
                .leftJoin(tenants, eq(userTenants.tenantId, tenants.id))
                .where(and(
                    eq(userTenants.userId, user.id),
                    eq(userTenants.status, 'active') // Only active members can login
                ));

            // SuperAdmin (username === 'admin') can login without tenant
            const isSuperAdmin = user.username === 'admin';

            if (userTenantsData.length === 0 && !isSuperAdmin) {
                return res.status(403).json({ error: "소속된 조직이 없습니다" });
            }

            // Set session
            req.session.userId = user.id;
            req.session.tenantId = userTenantsData.length > 0 ? userTenantsData[0].tenantId : undefined;

            // Update last login
            await db.update(users)
                .set({ lastLoginAt: new Date() })
                .where(eq(users.id, user.id));

            res.json({
                user: {
                    id: user.id,
                    username: user.username,
                    name: user.name
                },
                tenants: userTenantsData.map(ut => ({
                    id: ut.tenantId,
                    name: ut.tenantName,
                    slug: ut.tenantSlug,
                    role: ut.role,
                    isActive: ut.tenantIsActive
                })),
                currentTenant: userTenantsData.length > 0 ? userTenantsData[0].tenantId : null
            });
        } catch (error) {
            console.error("Login error:", error);
            res.status(500).json({ error: "로그인 중 오류가 발생했습니다" });
        }
    });

    /**
     * POST /api/auth/logout
     * Logout current user
     */
    app.post("/api/auth/logout", (req: Request, res: Response) => {
        req.session.destroy((err) => {
            if (err) {
                return res.status(500).json({ error: "로그아웃 중 오류가 발생했습니다" });
            }
            res.json({ message: "로그아웃되었습니다" });
        });
    });

    /**
     * GET /api/auth/me
     * Get current user info
     */
    app.get("/api/auth/me", async (req: Request, res: Response) => {
        if (!req.session?.userId) {
            return res.status(401).json({ error: "인증되지 않았습니다" });
        }

        try {
            const user = await db.query.users.findFirst({
                where: eq(users.id, req.session.userId)
            });

            if (!user) {
                return res.status(404).json({ error: "사용자를 찾을 수 없습니다" });
            }

            // Get user's tenants using join
            const userTenantsData = await db
                .select({
                    id: userTenants.id,
                    userId: userTenants.userId,
                    tenantId: userTenants.tenantId,
                    role: userTenants.role,
                    permissions: userTenants.permissions,
                    divisionId: userTenants.divisionId,
                    teamId: userTenants.teamId,
                    tenantName: tenants.name,
                    tenantSlug: tenants.slug,
                    tenantIsActive: tenants.isActive
                })
                .from(userTenants)
                .leftJoin(tenants, eq(userTenants.tenantId, tenants.id))
                .where(eq(userTenants.userId, user.id));

            res.json({
                user: {
                    id: user.id,
                    username: user.username,
                    name: user.name
                },
                tenants: userTenantsData.map(ut => ({
                    id: ut.tenantId,
                    name: ut.tenantName,
                    slug: ut.tenantSlug,
                    role: ut.role,
                    permissions: ut.permissions,
                    divisionId: ut.divisionId,
                    teamId: ut.teamId,
                    isActive: ut.tenantIsActive
                })),
                currentTenant: req.session.tenantId
            });
        } catch (error) {
            console.error("Get user error:", error);
            res.status(500).json({ error: "사용자 정보를 불러오는 중 오류가 발생했습니다" });
        }
    });

    /**
     * POST /api/auth/switch-tenant
     * Switch to a different tenant
     */
    app.post("/api/auth/switch-tenant", async (req: Request, res: Response) => {
        if (!req.session?.userId) {
            return res.status(401).json({ error: "인증되지 않았습니다" });
        }

        const { tenantId } = req.body;

        if (!tenantId) {
            return res.status(400).json({ error: "테넌트 ID가 필요합니다" });
        }

        try {
            // Verify user has access to this tenant using join
            const result = await db
                .select({
                    id: userTenants.id,
                    userId: userTenants.userId,
                    tenantId: userTenants.tenantId,
                    role: userTenants.role,
                    tenantName: tenants.name,
                    tenantSlug: tenants.slug,
                    tenantIsActive: tenants.isActive
                })
                .from(userTenants)
                .leftJoin(tenants, eq(userTenants.tenantId, tenants.id))
                .where(and(
                    eq(userTenants.userId, req.session.userId),
                    eq(userTenants.tenantId, tenantId)
                ))
                .limit(1);

            if (result.length === 0) {
                return res.status(403).json({ error: "이 조직에 대한 접근 권한이 없습니다" });
            }

            const userTenant = result[0];
            if (!userTenant.tenantIsActive) {
                return res.status(403).json({ error: "비활성화된 조직입니다" });
            }

            // Switch tenant
            req.session.tenantId = tenantId;

            res.json({
                message: "조직이 전환되었습니다",
                tenant: {
                    id: userTenant.tenantId,
                    name: userTenant.tenantName,
                    slug: userTenant.tenantSlug
                }
            });
        } catch (error) {
            console.error("Switch tenant error:", error);
            res.status(500).json({ error: "조직 전환 중 오류가 발생했습니다" });
        }
    });
}
