import { Hono } from "hono";
import { db, schema } from "../db/index.js";
import { desc } from "drizzle-orm";

const transcripts = new Hono();

// GET /api/v1/transcripts - Returns all videos and VODs with bang data
transcripts.get("/", async (c) => {
  try {
    const result = await db
      .select({
        videoId: schema.videos.videoId,
        title: schema.videos.title,
        publishedAt: schema.videos.publishedAt,
        fileName: schema.videos.fileName,
        bang_count: schema.videos.bangCount,
        bangs: schema.videos.bangs,
        source: schema.videos.source,
      })
      .from(schema.videos)
      .orderBy(desc(schema.videos.publishedAt));

    return c.json(result);
  } catch (error) {
    console.error("Error fetching transcripts:", error);
    return c.json({ error: "Failed to fetch transcripts" }, 500);
  }
});

export default transcripts;
