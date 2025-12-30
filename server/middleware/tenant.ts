import type { Request, Response, NextFunction } from "express";
import { db } from "../db";
import { eq, and } from "drizzle-orm";
import { userTenants, tenants } from "@shared/schema";

/**
 * Tenant context middleware
 * Verifies user has access to the selected tenant and loads tenant data
 */
export async function tenantContext(req: Request, res: Response, next: NextFunction) {
    // Only apply if user is authenticated and has selected a tenant
    if (req.session?.userId && req.session?.tenantId) {
        try {
            // Verify user has access to this tenant
            const userTenant = await db.query.userTenants.findFirst({
                where: and(
                    eq(userTenants.userId, req.session.userId),
                    eq(userTenants.tenantId, req.session.tenantId)
                )
            });

            if (!userTenant) {
                // If the session has a tenant ID but the user does not have access (or DB was reset),
                // clear the stale session data and allow the request to proceed as unauthenticated/partial.
                // This prevents blocking the main page load with a JSON error.
                delete req.session.tenantId;
                // We might also want to check if the user exists at all, but for now allow flow to continue.
            } else {

                // Load tenant data
                const tenant = await db.query.tenants.findFirst({
                    where: eq(tenants.id, req.session.tenantId)
                });

                if (!tenant || !tenant.isActive) {
                    return res.status(403).json({ error: "테넌트를 찾을 수 없거나 비활성화되었습니다" });
                }

                // Attach tenant and role to request
                req.tenant = tenant;
                req.userRole = userTenant.role;
            }
        } catch (error) {
            console.error("Tenant context error:", error);
            return res.status(500).json({ error: "테넌트 정보를 불러오는 중 오류가 발생했습니다" });
        }
    }

    next();
}

/**
 * Role-based access control middleware
 * Requires specific role(s) to access the endpoint
 */
export function requireRole(...allowedRoles: string[]) {
    return (req: Request, res: Response, next: NextFunction) => {
        if (!req.userRole) {
            return res.status(403).json({ error: "권한 정보를 찾을 수 없습니다" });
        }

        if (!allowedRoles.includes(req.userRole)) {
            return res.status(403).json({
                error: "이 작업을 수행할 권한이 없습니다",
                required: allowedRoles,
                current: req.userRole
            });
        }

        next();
    };
}
