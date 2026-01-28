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
        username: true,
        activeSessionId: true
      }
    });

    if (!user) {
      return res.status(401).json({ error: "사용자를 찾을 수 없습니다" });
    }

    // Allow multiple sessions for readonly01 account
    const allowMultipleSessions = user.username === 'readonly01';

    // Check if this session is still valid (matches the active session)
    if (!allowMultipleSessions && user.activeSessionId && user.activeSessionId !== req.sessionID) {
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

/**
 * Middleware factory to require specific permission level for a menu
 * @param menu - Menu name (incoming, outgoing, usage, inventory)
 * @param level - Required permission level (read, write, own_only)
 */
export function requirePermission(menu: 'incoming' | 'outgoing' | 'usage' | 'inventory', level: 'read' | 'write' | 'own_only' = 'write') {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.session?.userId || !req.session?.tenantId) {
      return res.status(401).json({ error: "인증이 필요합니다" });
    }

    try {
      const { db } = await import("../db.js");
      const { userTenants } = await import("../../shared/schema.js");
      const { and, eq } = await import("drizzle-orm");

      const [userTenant] = await db
        .select()
        .from(userTenants)
        .where(and(
          eq(userTenants.userId, req.session.userId),
          eq(userTenants.tenantId, req.session.tenantId)
        ))
        .limit(1);

      if (!userTenant) {
        return res.status(403).json({ error: "권한이 없습니다" });
      }

      // Owners and Admins always have full access
      if (userTenant.role === 'owner' || userTenant.role === 'admin') {
        return next();
      }

      // Check permissions
      const permissions = userTenant.permissions as any;
      if (!permissions || !permissions[menu]) {
        return res.status(403).json({ error: "권한이 없습니다" });
      }

      const userPerm = permissions[menu];

      // Check permission level
      if (userPerm === 'none') {
        return res.status(403).json({ error: "권한이 없습니다" });
      }

      if (level === 'write' && userPerm !== 'write') {
        return res.status(403).json({ error: "쓰기 권한이 필요합니다" });
      }

      if (level === 'own_only' && userPerm !== 'own_only' && userPerm !== 'write') {
        return res.status(403).json({ error: "권한이 없습니다" });
      }

      next();
    } catch (error) {
      console.error("Permission check error:", error);
      res.status(500).json({ error: "권한 확인 중 오류가 발생했습니다" });
    }
  };
}

/**
 * Auto permission check based on HTTP method
 * GET = read permission, POST/PATCH/PUT/DELETE = write permission
 * @param menu - Menu name (incoming, outgoing, usage, inventory)
 */
export function autoCheckPermission(menu: 'incoming' | 'outgoing' | 'usage' | 'inventory') {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Determine required permission level based on HTTP method
    const isReadOnly = req.method === 'GET' || req.method === 'HEAD';
    const level = isReadOnly ? 'read' : 'write';

    // Use the existing requirePermission logic
    return requirePermission(menu, level)(req, res, next);
  };
}
