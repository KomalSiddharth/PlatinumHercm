import express from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { setupScheduledTasks } from "./scheduler"; // ✅ ADD
import session from "express-session";
import connectPgSimple from "connect-pg-simple";

const app = express();
app.set("trust proxy", 1);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: false, limit: "10mb" }));

const PgSession = connectPgSimple(session);

app.use(
  session({
    store: new PgSession({
      conString: process.env.DATABASE_URL,
      tableName: "session",
      createTableIfMissing: false,
    }),
    secret: process.env.SESSION_SECRET || "dev-secret",
    resave: false,
    saveUninitialized: false,
    proxy: true,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      sameSite: "none",
      httpOnly: true,
      maxAge: 30 * 24 * 60 * 60 * 1000,
    },
  })
);

(async () => {
  // 1️⃣ Register routes
  const server = await registerRoutes(app);

  // 2️⃣ 🔥 START CRON JOBS (MOST IMPORTANT)
  setupScheduledTasks();

  // 3️⃣ Error handler
  app.use((err, _req, res, _next) => {
    const status = err.status || 500;
    res.status(status).json({ message: err.message || "Internal Server Error" });
  });

  // 4️⃣ Serve frontend
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // 5️⃣ Start server
  const port = parseInt(process.env.PORT || "5000", 10);
  server.listen(
    { port, host: "0.0.0.0", reusePort: true },
    () => log(`serving on port ${port}`)
  );
})();
