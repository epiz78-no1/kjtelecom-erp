import "dotenv/config";
import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { registerAuthRoutes } from "./routes/auth.js";
import { registerInventoryRoutes } from "./routes/inventory.js";
import { registerOpticalRoutes } from "./routes/optical.js";
import { registerDemolitionRoutes } from "./routes/demolition.js";
import { registerTeamsRoutes } from "./routes/teams.js";
import { registerSystemRoutes } from "./routes/system.js";
import { registerStorageRoutes } from "./routes/storage.js";
import { tenantContext } from "./middleware/tenant.js";
import { serveStatic } from "./static.js";
import { createServer } from "http";
import { pool } from "./db.js";
import { registerAdminRoutes } from "./admin.js";
import { ensureUsers } from "./db_init.js";

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
  limit: '50mb',
  verify: (req, _res, buf) => {
    req.rawBody = buf;
  },
}));

app.use(express.urlencoded({ extended: false, limit: '50mb' }));

app.set("trust proxy", 1); // Trust first proxy (Vercel) for secure cookies


// Session configuration
const PgStore = connectPgSimple(session);

app.use(session({
  store: new PgStore({
    pool, // Uses existing db pool from ./db
    tableName: 'session',
    createTableIfMissing: true, // Although we ran SQL, this is safe
    ttl: 3600 // 1 hour session duration (server-side)
  }),
  secret: process.env.SESSION_SECRET || 'pro-tracker-secret-key-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    // maxAge 미설정: 브라우저 종료 시 세션 만료 (Session Cookie)
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
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
      if (capturedJsonResponse && process.env.NODE_ENV !== 'production') {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      log(logLine);
    }
  });

  next();
});

// Initialize routes immediately to handle Vercel Cold Starts
registerAuthRoutes(app);
registerInventoryRoutes(app);
registerTeamsRoutes(app);
registerOpticalRoutes(app);
registerDemolitionRoutes(app);
registerStorageRoutes(app);
registerAdminRoutes(app);

// Template Download API (Global priority)
app.get("/api/templates/:type", (req, res, next) => {
  if (!req.session?.userId) return res.status(401).json({ error: "Unauthorized" });
  if (!req.session?.tenantId) return res.status(403).json({ error: "Tenant not selected" });
  next();
}, (req, res) => {
  const { type } = req.params;
  console.log(`[DOWNLOAD] Requesting template: ${type} for tenant ${req.session?.tenantId}`);

  let template = "";
  let filename = "";

  if (type === "inventory") {
    template = `사업,품명,규격,재고현황,현장팀보유재고,사무실보유재고,단가,금액
  SKT,광접속함체 무여장중간분기형,24C,109,100,9,147882,1330938
  SKT,광접속함체 직선형,가공 24C,1307,1302,5,40150,200750`;
    filename = "inventory_template.csv";
  } else if (type === "outgoing") {
    template = `출고일,사업,수령팀,공사명,품명,규격,수량,수령인
  2024-12-24,접속팀,접속팀,효자동 2가 함체교체,광접속함체 돔형,가공 96C,5,홍길동
  2024-12-24,외선팀,외선팀,종로구 광케이블 설치,광점퍼코드,SM 1C SC/APC-SC/APC 3M,20,김철수`;
    filename = "outgoing_template.csv";
  } else if (type === "incoming") {
    template = `입고일,사업,구매처,공사명,품명,규격,수량,비고
  2024-12-24,SKT,텔레시스,[광텔] 2025년 SKT 운용사업,광접속함체 돔형,가공 96C,10,
  2024-12-24,SKT,삼성전자,[광텔] 2025년 SKT 운용사업,광점퍼코드,SM 1C SC/APC-SC/APC 3M,50,긴급입고`;
    filename = "incoming_template.csv";
  } else {
    return res.status(404).json({ error: "Template not found" });
  }

  const csvContent = "\uFEFF" + template;
  const buffer = Buffer.from(csvContent, 'utf-8');

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(buffer);
});

// Register application routes (async but registers immediately since no awaits inside)
// Register application routes
// Debugging Endpoint
app.post("/api/debug-log", async (req, res) => {
  try {
    const { message, data } = req.body;
    const logEntry = `[CLIENT-LOG] ${new Date().toISOString()} ${message} : ${JSON.stringify(data)}\n`;
    const fs = await import("fs");
    fs.appendFileSync("debug_output.txt", logEntry); // Use sync for simplicity
    console.log(logEntry.trim());
    res.json({ success: true });
  } catch (e) {
    console.error("Log failed", e);
    res.status(500).json({ error: "Log failed" });
  }
});

registerSystemRoutes(app);

// Start DB Initialization in background (don't block server startup)
ensureUsers().catch(e => console.error("Failed to ensure users:", e));

// Setup Vite or Serve Static
if (process.env.NODE_ENV === "production") {
  if (process.env.VERCEL !== '1') {
    serveStatic(app);
  }
} else {
  // In development, we need to wait for Vite setup? 
  // Vite setup can be async.
  (async () => {
    try {
      const { setupVite } = await import("./vite");
      await setupVite(httpServer, app);
    } catch (err) {
      console.error("Vite setup failed:", err);
    }
  })();
}

// Global Error Handler
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal Server Error";

  // Log the error for debugging on Vercel
  console.error('[Global Error Handler]', err);

  // Send JSON response and stop propagation
  res.status(status).json({ message });
});

// Server Listen
if (process.env.VERCEL !== '1') {
  const port = parseInt(process.env.PORT || "5001", 10);
  httpServer.listen(
    {
      port,
      host: "0.0.0.0",
    },
    () => {
      log(`serving on port ${port}`);
    },
  );
}

export { app };
