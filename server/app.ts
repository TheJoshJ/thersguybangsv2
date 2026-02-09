import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { prettyJSON } from "hono/pretty-json";
import { HTTPException } from "hono/http-exception";
import { serveStatic } from "@hono/node-server/serve-static";
import fs from "fs";
import path from "path";

import { routes } from "./routes/index.js";

// Create the Hono app
const app = new Hono();

// Global middleware
app.use("*", logger());
app.use("*", prettyJSON());
app.use(
  "*",
  cors({
    origin: [
      "http://localhost:5173",
      "http://localhost:3000",
      "https://thersguybangs.com",
      "https://www.thersguybangs.com",
    ],
    allowMethods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

// Health check endpoint
app.get("/api/health", (c) => {
  return c.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Mount all API routes under /api/v1
app.route("/api/v1", routes);

// Global error handler
app.onError((err, c) => {
  console.error("Server error:", err);

  if (err instanceof HTTPException) {
    return c.json({ error: err.message }, err.status);
  }

  return c.json({ error: "Internal Server Error" }, 500);
});

// In production, serve static files and handle SPA routing
if (process.env.NODE_ENV === "production") {
  // Serve static assets
  app.use("/assets/*", serveStatic({ root: "./dist" }));

  // Serve other static files (favicon, etc.)
  app.use("/*", serveStatic({ root: "./dist" }));

  // SPA fallback - serve index.html for all non-API routes
  app.get("*", async (c) => {
    // Don't serve index.html for API routes
    if (c.req.path.startsWith("/api")) {
      return c.json({ error: "Not Found" }, 404);
    }

    const indexPath = path.join(process.cwd(), "dist", "index.html");
    const html = fs.readFileSync(indexPath, "utf-8");
    return c.html(html);
  });
} else {
  // 404 handler for API routes in development
  app.notFound((c) => {
    return c.json({ error: "Not Found" }, 404);
  });
}

export default app;
