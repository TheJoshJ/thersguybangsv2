import { Hono } from "hono";
import { db, schema } from "../db/index.js";
import { sql } from "drizzle-orm";

const bangs = new Hono();

// GET /api/v1/bangs - Returns total bang count across all videos
bangs.get("/", async (c) => {
  try {
    const result = await db
      .select({
        total: sql<number>`COALESCE(SUM(${schema.videos.bangCount}), 0)`,
      })
      .from(schema.videos);

    return c.json({ total_bangs: Number(result[0]?.total ?? 0) });
  } catch (error) {
    console.error("Error fetching bang count:", error);
    return c.json({ error: "Failed to fetch bang count" }, 500);
  }
});

export default bangs;
