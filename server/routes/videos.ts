import { Hono } from "hono";
import { db, schema } from "../db/index.js";
import { eq, desc } from "drizzle-orm";

const videos = new Hono();

// GET /api/v1/videos - Returns all regular videos with bang data
videos.get("/", async (c) => {
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
      .where(eq(schema.videos.source, "video"))
      .orderBy(desc(schema.videos.publishedAt));

    return c.json(result);
  } catch (error) {
    console.error("Error fetching videos:", error);
    return c.json({ error: "Failed to fetch videos" }, 500);
  }
});

export default videos;
