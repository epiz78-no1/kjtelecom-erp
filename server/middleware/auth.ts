import type { Request, Response, NextFunction } from "express";

/**
 * Middleware to require authentication
 * Checks if user is logged in via session and validates session ID
 */
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session?.userId) {
    return res.status(401).json({ error: "인증이 필요합니다" });
  }

  // Validate session ID to prevent duplicate logins
  try {
    const { db } = await import("../db.js");
    const { users } = await import("../../shared/schema.js");
    const { eq } = await import("drizzle-orm");

    const user = await db.query.users.findFirst({
      where: eq(users.id, req.session.userId),
      columns: {
        id: true,
        activeSessionId: true
      }
    });

    if (!user) {
      return res.status(401).json({ error: "사용자를 찾을 수 없습니다" });
    }

    // Check if this session is still valid (matches the active session)
    if (user.activeSessionId && user.activeSessionId !== req.sessionID) {
      // Another session has logged in, invalidate this session
      req.session.destroy(() => { });
      return res.status(401).json({ error: "다른 곳에서 로그인되어 현재 세션이 종료되었습니다" });
    }

    next();
  } catch (error) {
    console.error("Session validation error:", error);
    return res.status(500).json({ error: "인증 확인 중 오류가 발생했습니다" });
  }
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
    const { db } = await import("../db.js");
    const { userTenants } = await import("../../shared/schema.js");
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
