import { Hono } from "hono";
import { db, schema } from "../db/index.js";
import { eq, desc } from "drizzle-orm";

const vods = new Hono();

// GET /api/v1/vods - Returns all VODs with bang data
vods.get("/", async (c) => {
  try {
    const result = await db
      .select({
        videoId: schema.videos.videoId,
        title: schema.videos.title,
        publishedAt: schema.videos.publishedAt,
        fileName: schema.videos.fileName,
        bang_count: schema.videos.bangCount,
        bangs: schema.videos.bangs,
      })
      .from(schema.videos)
      .where(eq(schema.videos.source, "vod"))
      .orderBy(desc(schema.videos.publishedAt));

    return c.json(result);
  } catch (error) {
    console.error("Error fetching VODs:", error);
    return c.json({ error: "Failed to fetch VODs" }, 500);
  }
});

export default vods;
