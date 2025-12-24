import type { Request, Response, NextFunction } from "express";

/**
 * Middleware to require authentication
 * Checks if user is logged in via session
 */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session?.userId) {
    return res.status(401).json({ error: "인증이 필요합니다" });
  }
  next();
}

/**
 * Middleware to require tenant selection
 * Checks if user has selected a tenant
 */
export function requireTenant(req: Request, res: Response, next: NextFunction) {
  if (!req.session?.tenantId) {
    return res.status(403).json({ error: "테넌트를 선택해주세요" });
  }
  next();
}

/**
 * Optional auth middleware - doesn't block if not authenticated
 * Useful for endpoints that work differently for authenticated users
 */
export function optionalAuth(req: Request, res: Response, next: NextFunction) {
  // Just pass through, session data will be available if user is logged in
  next();
}

/**
 * Middleware to require admin/owner role for the current tenant
 */
export async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.session?.userId || !req.session?.tenantId) {
    return res.status(401).json({ error: "인증이 필요합니다" });
  }

  try {
    const { db } = await import("../db");
    const { userTenants } = await import("@shared/schema");
    const { and, eq, or } = await import("drizzle-orm");

    const [userTenant] = await db
      .select()
      .from(userTenants)
      .where(and(
        eq(userTenants.userId, req.session.userId),
        eq(userTenants.tenantId, req.session.tenantId)
      ))
      .limit(1);

    if (!userTenant || (userTenant.role !== 'admin' && userTenant.role !== 'owner')) {
      return res.status(403).json({ error: "관리자 권한이 필요합니다" });
    }

    next();
  } catch (error) {
    console.error("Admin check error:", error);
    res.status(500).json({ error: "권한 확인 중 오류가 발생했습니다" });
  }
}
