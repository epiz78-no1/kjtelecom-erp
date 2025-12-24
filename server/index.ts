import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { registerRoutes } from "./routes";
import { registerAuthRoutes } from "./auth";
import { tenantContext } from "./middleware/tenant";
import { serveStatic } from "./static";
import { createServer } from "http";
import { pool } from "./db";

const app = express();
const httpServer = createServer(app);

// Extend Express types for session and tenant data
declare module "express-session" {
  interface SessionData {
    userId?: string;
    tenantId?: string;
  }
}

declare global {
  namespace Express {
    interface Request {
      tenant?: any;
      userRole?: string;
    }
  }
}

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

app.use(express.json({
  verify: (req, _res, buf) => {
    req.rawBody = buf;
  },
}));

app.use(express.urlencoded({ extended: false }));

// Session configuration
import sessionFileStore from "session-file-store";
const FileStore = sessionFileStore(session);

app.use(session({
  store: new FileStore({
    path: './.data/sessions',
    ttl: 30 * 24 * 60 * 60, // 30 days
  }),
  secret: process.env.SESSION_SECRET || 'pro-tracker-secret-key-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax'
  }
}));

// Tenant context middleware - applies to all routes
app.use(tenantContext);

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  if (!process.env.DATABASE_URL) {
    const { db } = await import("./db");
    const { users } = await import("@shared/schema");
    const { migrate } = await import("drizzle-orm/pglite/migrator");
    const fs = await import("fs");
    const path = await import("path");

    // Check if migrations folder exists and has files
    const migrationsDir = "./migrations";
    if (fs.existsSync(migrationsDir)) {
      const { execSync } = await import("child_process");
      try {
        log("Checking for database migrations...");
        // Use our manual migration script for PGLite consistency
        execSync("npx tsx migrate_pglite.ts", { stdio: 'inherit' });
        log("Migrated PGLite database");
      } catch (e) {
        log("Migration failed, attempting automatic migration...", "error");
        await migrate(db, { migrationsFolder: migrationsDir });
      }
    }

    // Auto-seed if no users exist
    const userCount = await db.select().from(users);
    if (userCount.length === 0) {
      log("No users found. Running automatic seeding...");
      const { execSync } = await import("child_process");
      try {
        execSync("npm run db:seed", { stdio: 'inherit' });
        log("Automatic seeding complete");
      } catch (e) {
        log("Automatic seeding failed", "error");
      }
    }
  }

  // Temporary route for user request: setup 'admin' / '123456' with '광텔', '한주통신'
  app.post("/api/setup-test-data", async (req, res) => {
    try {
      const { db } = await import("./db");
      const { users, tenants, userTenants } = await import("@shared/schema");
      const { eq, and } = await import("drizzle-orm");
      const bcrypt = await import("bcrypt");

      const hashedPassword = await bcrypt.hash("123456", 10);
      let adminUser = await db.query.users.findFirst({ where: eq(users.username, "admin") });

      if (!adminUser) {
        [adminUser] = await db.insert(users).values({
          username: "admin",
          password: hashedPassword,
          name: "최고관리자"
        }).returning();
      } else {
        await db.update(users).set({ password: hashedPassword }).where(eq(users.id, adminUser.id));
      }

      const companies = ["광텔", "한주통신"];
      for (const name of companies) {
        let tenant = await db.query.tenants.findFirst({ where: eq(tenants.name, name) });
        if (!tenant) {
          const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-') + "-" + Date.now();
          [tenant] = await db.insert(tenants).values({ name, slug, isActive: true }).returning();
        }

        const existing = await db.query.userTenants.findFirst({
          where: and(eq(userTenants.userId, adminUser.id), eq(userTenants.tenantId, tenant.id))
        });
        if (!existing) {
          await db.insert(userTenants).values({
            userId: adminUser.id,
            tenantId: tenant.id,
            role: "owner",
            status: "active"
          });
        }
      }
      res.json({ message: "Test data setup complete: admin / 123456 with 광텔, 한주통신" });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Register authentication routes
  registerAuthRoutes(app);

  const { registerAdminRoutes } = await import("./admin");
  registerAdminRoutes(app);

  // Register application routes
  await registerRoutes(httpServer, app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen(
    {
      port,
      host: "0.0.0.0",
    },
    () => {
      log(`serving on port ${port}`);
    },
  );
})();
