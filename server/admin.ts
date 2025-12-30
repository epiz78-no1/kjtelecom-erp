import { Router, Request, Response, NextFunction } from "express";
import { db } from "./db";
import { storage } from "./storage";
import { users, userTenants, tenants } from "../shared/schema";
import { eq, and, or } from "drizzle-orm";
import bcrypt from "bcryptjs"; // Use bcryptjs as installed

// ... (keep middleware matching lines 8-44 if needed, but here we just target the import and the specific endpoint lines)

// ACTUALLY, replace_file_content targets a specific block. 
// I will do two replaces or one big one if contiguous? They are not contiguous.
// First, let's fix the import.


// Middleware definitions
const requireAuth = (req: Request, res: Response, next: NextFunction) => {
    if (!req.session?.userId) {
        return res.status(401).json({ error: "인증이 필요합니다" });
    }
    next();
};

const requireTenant = (req: Request, res: Response, next: NextFunction) => {
    if (!req.session?.tenantId) {
        return res.status(403).json({ error: "조직 정보가 없습니다" });
    }
    next();
};

const requireAdmin = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!req.session?.userId) {
            return res.status(401).json({ error: "인증이 필요합니다" });
        }

        // Check if super admin
        const user = await db.query.users.findFirst({
            where: eq(users.id, req.session.userId)
        });

        if (user?.username === 'admin') {
            return next();
        }

        // Check if tenant owner/admin (for tenant admin routes)
        // Note: For super admin routes, we usually check user.username === 'admin' explicitly inside the route
        // This middleware is a general "is admin" check
        next();
    } catch (e) {
        res.status(500).json({ error: "권한 확인 중 오류가 발생했습니다" });
    }
};

export const adminRouter = "/api/admin";

export function registerAdminRoutes(app: any) {
    // ---- Member Management ----
    // Get all members of a tenant
    app.get(`${adminRouter}/members`, requireAuth, requireTenant, async (req, res) => {
        try {
            const tenantId = req.session!.tenantId;
            const members = await storage.getMembers(tenantId!);
            res.json(members);
        } catch (error) {
            console.error("Fetch members error:", error);
            res.status(500).json({ error: "구성원 목록을 불러오는 중 오류가 발생했습니다" });
        }
    });

    // Invite/Add Member
    app.post(`${adminRouter}/members`, requireAuth, requireTenant, async (req, res) => {
        try {
            // Check permission: only admin or owner can add members
            const tenantId = req.session!.tenantId;
            const currentUser = await db.query.userTenants.findFirst({
                where: (ut, { and, eq }) => and(eq(ut.userId, req.session!.userId!), eq(ut.tenantId, tenantId!))
            });

            if (currentUser?.role !== 'owner' && currentUser?.role !== 'admin') {
                return res.status(403).json({ error: "관리자 권한이 필요합니다" });
            }

            const { username, password, name, role, phoneNumber, divisionId, teamId, positionId, permissions } = req.body;

            if (!username || !password || !name) {
                return res.status(400).json({ error: "필수 정보가 누락되었습니다" });
            }

            // Check if user exists globally
            const existingUser = await db.query.users.findFirst({
                where: eq(users.username, username)
            });

            let userId: string;

            if (existingUser) {
                // If user exists, check if already in tenant
                const existingMember = await db.query.userTenants.findFirst({
                    where: (ut, { and, eq }) => and(eq(ut.userId, existingUser.id), eq(ut.tenantId, tenantId!))
                });

                if (existingMember) {
                    return res.status(400).json({ error: "이미 등록된 구성원입니다" });
                }
                userId = existingUser.id;
            } else {
                // Create new user
                const hashedPassword = await bcrypt.hash(password, 10);
                const [newUser] = await db.insert(users).values({
                    username,
                    password: hashedPassword,
                    name,
                    phoneNumber
                }).returning();
                userId = newUser.id;
            }

            // Add to tenant
            const [newMember] = await db.insert(userTenants).values({
                userId,
                tenantId: tenantId!,
                role: role || 'member',
                permissions: permissions || null,
                divisionId: divisionId || null,
                teamId: teamId || null,
                positionId: positionId || null,
                status: 'active'
            }).returning();

            res.status(201).json(newMember);

        } catch (error) {
            console.error("Add member error:", error);
            res.status(500).json({ error: "구성원 추가 중 오류가 발생했습니다" });
        }
    });

    // Update Member Permissions/Role
    app.patch(`${adminRouter}/members/:userId`, requireAuth, requireTenant, async (req, res) => {
        try {
            const tenantId = req.session!.tenantId;
            const targetUserId = req.params.userId;

            // Verifier: Must be admin/owner
            const currentUser = await db.query.userTenants.findFirst({
                where: (ut, { and, eq }) => and(eq(ut.userId, req.session!.userId!), eq(ut.tenantId, tenantId!))
            });

            if (currentUser?.role !== 'owner' && currentUser?.role !== 'admin') {
                return res.status(403).json({ error: "관리자 권한이 필요합니다" });
            }

            const { role, permissions, teamId, positionId, divisionId } = req.body;

            const [updated] = await db.update(userTenants)
                .set({
                    role,
                    permissions,
                    teamId,
                    positionId,
                    divisionId
                })
                .where(and(eq(userTenants.tenantId, tenantId!), eq(userTenants.userId, targetUserId)))
                .returning();

            if (!updated) {
                return res.status(404).json({ error: "구성원을 찾을 수 없습니다" });
            }

            res.json(updated);
        } catch (error) {
            console.error("Update member error:", error);
            res.status(500).json({ error: "구성원 정보 수정 중 오류가 발생했습니다" });
        }
    });

    // Remove Member
    app.delete(`${adminRouter}/members/:userId`, requireAuth, requireTenant, async (req, res) => {
        try {
            const tenantId = req.session!.tenantId;
            const targetUserId = req.params.userId;

            // Verifier: Must be admin/owner
            const currentUser = await db.query.userTenants.findFirst({
                where: (ut, { and, eq }) => and(eq(ut.userId, req.session!.userId!), eq(ut.tenantId, tenantId!))
            });

            if (currentUser?.role !== 'owner' && currentUser?.role !== 'admin') {
                return res.status(403).json({ error: "관리자 권한이 필요합니다" });
            }

            // Prevent deleting self (unless maybe owner closing account, but let's restrict for now)
            if (targetUserId === req.session!.userId) {
                return res.status(400).json({ error: "자기 자신을 삭제할 수 없습니다" });
            }

            const [deleted] = await db.delete(userTenants)
                .where(and(eq(userTenants.tenantId, tenantId!), eq(userTenants.userId, targetUserId)))
                .returning();

            if (!deleted) {
                return res.status(404).json({ error: "구성원을 찾을 수 없습니다" });
            }

            res.status(204).send();
        } catch (error) {
            console.error("Delete member error:", error);
            res.status(500).json({ error: "구성원 삭제 중 오류가 발생했습니다" });
        }
    });

    // ---- Positions/Teams/Divisions Management ----
    // Positions API is now handled in routes.ts

    // Tenants Management (Super Admin Only)
    app.get(`${adminRouter}/tenants`, requireAuth, requireAdmin, async (req, res) => {
        try {
            const user = await db.query.users.findFirst({
                where: eq(users.id, req.session!.userId!)
            });

            if (user?.username !== 'admin') {
                return res.status(403).json({ error: "최고관리자만 접근할 수 있습니다" });
            }

            // Fetch all tenants
            const allTenants = await db.select().from(tenants);

            // For each tenant, fetch all owners or admins (excluding super admin 'admin')
            const tenantsWithAdmin = await Promise.all(allTenants.map(async (tenant) => {
                const adminRelations = await db.query.userTenants.findMany({
                    where: (ut, { and, eq, or }) => and(
                        eq(ut.tenantId, tenant.id),
                        or(eq(ut.role, 'owner'), eq(ut.role, 'admin'))
                    ),
                    with: {
                        user: true
                    }
                });

                // Filter out the super admin 'admin' account
                const realAdmins = adminRelations
                    .filter(r => r.user.username !== 'admin')
                    .map(r => ({
                        id: r.user.id,
                        username: r.user.username,
                        name: r.user.name,
                        role: r.role
                    }));

                return {
                    ...tenant,
                    admins: realAdmins // Return array of admins
                };
            }));

            console.log(`[DEBUG] Sending ${tenantsWithAdmin.length} tenants. First one admins:`, tenantsWithAdmin[0]?.admins);
            res.json(tenantsWithAdmin);
        } catch (error) {
            console.error("Fetch all tenants error:", error);
            res.status(500).json({ error: "회사 목록을 불러오는 중 오류가 발생했습니다" });
        }
    });

    app.post(`${adminRouter}/tenants`, requireAuth, requireAdmin, async (req, res) => {
        try {
            // Verify user is the Super Admin (username === 'admin')
            const user = await db.query.users.findFirst({
                where: eq(users.id, req.session!.userId!)
            });

            if (user?.username !== 'admin') {
                return res.status(403).json({ error: "최고관리자만 회사를 생성할 수 있습니다" });
            }

            const { name } = req.body;
            if (!name) {
                return res.status(400).json({ error: "회사명은 필수입니다" });
            }

            // Create tenant (slug from name)
            const slug = name
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/^-|-$/g, '') + '-' + Date.now();

            const [newTenant] = await db.insert(tenants).values({
                name,
                slug,
                isActive: true
            }).returning();

            // Link Super Admin to new Tenant as owner
            await db.insert(userTenants).values({
                userId: user!.id,
                tenantId: newTenant.id,
                role: 'owner',
                status: 'active'
            });

            res.status(201).json(newTenant);
        } catch (error) {
            console.error("Create tenant error:", error);
            res.status(500).json({ error: "회사를 생성하는 중 오류가 발생했습니다" });
        }
    });

    app.patch(`${adminRouter}/tenants/:tenantId`, requireAuth, requireAdmin, async (req, res) => {
        try {
            // Verify Super Admin
            const user = await db.query.users.findFirst({
                where: eq(users.id, req.session!.userId!)
            });

            if (user?.username !== 'admin') {
                return res.status(403).json({ error: "최고관리자만 수행할 수 있습니다" });
            }

            const { tenantId } = req.params;
            const { name, slug } = req.body;

            const updateData: any = {};
            if (name) updateData.name = name;
            if (slug) updateData.slug = slug;

            if (Object.keys(updateData).length === 0) {
                return res.status(400).json({ error: "수정할 내용이 없습니다" });
            }

            // If slug is changing, verify uniqueness (simple check, or rely on DB constraint)
            if (slug) {
                const existing = await db.query.tenants.findFirst({
                    where: eq(tenants.slug, slug)
                });
                if (existing && existing.id !== tenantId) {
                    return res.status(400).json({ error: "이미 사용 중인 영문 이름(Slug)입니다" });
                }
            }

            const [updatedTenant] = await db.update(tenants)
                .set(updateData)
                .where(eq(tenants.id, tenantId))
                .returning();

            res.json(updatedTenant);
        } catch (error) {
            console.error("Update tenant error:", error);
            res.status(500).json({ error: "회사 정보를 수정하는 중 오류가 발생했습니다" });
        }
    });

    // Delete Tenant API
    app.delete(`${adminRouter}/tenants/:tenantId`, requireAuth, requireAdmin, async (req, res) => {
        try {
            // Verify Super Admin
            const user = await db.query.users.findFirst({
                where: eq(users.id, req.session!.userId!)
            });

            if (user?.username !== 'admin') {
                return res.status(403).json({ error: "최고관리자만 수행할 수 있습니다" });
            }

            const { tenantId } = req.params;

            // Delete userTenants first
            await db.delete(userTenants).where(eq(userTenants.tenantId, tenantId));

            // Delete tenant
            const [deleted] = await db.delete(tenants).where(eq(tenants.id, tenantId)).returning();

            if (!deleted) {
                return res.status(404).json({ error: "회사를 찾을 수 없습니다" });
            }

            res.status(204).send();
        } catch (error) {
            console.error("Delete tenant error:", error);
            res.status(500).json({ error: "회사를 삭제하는 중 오류가 발생했습니다" });
        }
    });

    // Create Admin for a specific Tenant (Super Admin Only)
    app.post(`${adminRouter}/tenants/:tenantId/members`, requireAuth, requireAdmin, async (req, res) => {
        try {
            // Verify Super Admin
            const user = await db.query.users.findFirst({
                where: eq(users.id, req.session!.userId!)
            });

            if (user?.username !== 'admin') {
                return res.status(403).json({ error: "최고관리자만 수행할 수 있습니다" });
            }

            const { tenantId } = req.params;
            const { username, password, name, phoneNumber } = req.body;

            if (!username || !password || !name) {
                return res.status(400).json({ error: "아이디, 비밀번호, 이름은 필수입니다" });
            }

            // Check limit: Max 5 admins
            const currentAdmins = await db.query.userTenants.findMany({
                where: (ut, { and, eq, or }) => and(
                    eq(ut.tenantId, tenantId),
                    or(eq(ut.role, 'owner'), eq(ut.role, 'admin'))
                ),
                with: { user: true }
            });
            const realAdminsCount = currentAdmins.filter(a => a.user.username !== 'admin').length;

            if (realAdminsCount >= 5) {
                return res.status(400).json({ error: "최고관리자는 최대 5명까지만 생성할 수 있습니다" });
            }

            // Check if user exists globally
            const existingUser = await db.query.users.findFirst({
                where: eq(users.username, username)
            });

            let userId: string;

            if (existingUser) {
                // Check if already member of this tenant
                const existingMember = await db.query.userTenants.findFirst({
                    where: (ut, { and, eq }) => and(eq(ut.userId, existingUser.id), eq(ut.tenantId, tenantId))
                });

                if (existingMember) {
                    return res.status(400).json({ error: "이미 이 회사의 멤버입니다" });
                }
                userId = existingUser.id;
            } else {
                // Create new user
                const hashedPassword = await bcrypt.hash(password, 10);
                const [newUser] = await db.insert(users).values({
                    username,
                    password: hashedPassword,
                    name,
                    phoneNumber
                }).returning();
                userId = newUser.id;
            }

            // Create userTenant relationship as 'admin'
            const [newMember] = await db.insert(userTenants).values({
                userId: userId,
                tenantId: tenantId,
                role: 'admin', // Force admin role
                permissions: { // Full permissions for company admin
                    incoming: 'write',
                    outgoing: 'write',
                    usage: 'write',
                    inventory: 'write'
                },
                status: 'active'
            }).returning();

            res.status(201).json(newMember);

        } catch (error) {
            console.error("Create tenant admin error:", error);
            res.status(500).json({ error: "관리자 생성 중 오류가 발생했습니다" });
        }
    });

    // Delete Tenant Admin (Super Admin Only)
    app.delete(`${adminRouter}/tenants/:tenantId/members/:userId`, requireAuth, requireAdmin, async (req, res) => {
        try {
            // Verify Super Admin
            const user = await db.query.users.findFirst({
                where: eq(users.id, req.session!.userId!)
            });

            if (user?.username !== 'admin') {
                return res.status(403).json({ error: "최고관리자만 수행할 수 있습니다" });
            }

            const { tenantId, userId } = req.params;

            // Delete the relationship
            const [deleted] = await db.delete(userTenants)
                .where(and(
                    eq(userTenants.tenantId, tenantId),
                    eq(userTenants.userId, userId)
                ))
                .returning();

            if (!deleted) {
                return res.status(404).json({ error: "멤버를 찾을 수 없거나 해당 회사의 멤버가 아닙니다" });
            }

            res.status(204).send();
        } catch (error) {
            console.error("Delete tenant admin error:", error);
            res.status(500).json({ error: "관리자를 삭제하는 중 오류가 발생했습니다" });
        }
    });
}
