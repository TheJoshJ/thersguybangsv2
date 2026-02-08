import app from "./app.js";

// Export the app for @hono/vite-dev-server
export default app;

// Only start the standalone server in production
if (process.env.NODE_ENV === "production") {
  const { serve } = await import("@hono/node-server");
  const port = parseInt(process.env.PORT || "3000", 10);

  serve({
    fetch: app.fetch,
    port,
  });

  console.log(`Server running at http://localhost:${port}`);
}
