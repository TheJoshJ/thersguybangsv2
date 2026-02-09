import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../db/schema.js";
import fs from "fs";
import path from "path";

// Path to the old Express repo data files
const EXPRESS_REPO_PATH = "C:/Users/thejo/Documents/GitHub/TheRSGuyBangsExpress";
const VIDEOS_JSON_PATH = path.join(
  EXPRESS_REPO_PATH,
  "src/resources/counts/videos_with_counts.json"
);
const VODS_JSON_PATH = path.join(
  EXPRESS_REPO_PATH,
  "src/resources/counts/vods_with_counts.json"
);

interface OldVideoRecord {
  videoId: string;
  title: string;
  publishedAt: string;
  fileName?: string;
  bang_count: number;
  bangs: Array<{ timestamp: number; transcript: string }>;
}

async function importData() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    console.error("DATABASE_URL environment variable is not set");
    process.exit(1);
  }

  const client = postgres(connectionString);
  const db = drizzle(client, { schema });

  console.log("Starting data import...\n");

  try {
    // Import regular videos
    if (fs.existsSync(VIDEOS_JSON_PATH)) {
      console.log("Importing videos from:", VIDEOS_JSON_PATH);
      const videosData: OldVideoRecord[] = JSON.parse(
        fs.readFileSync(VIDEOS_JSON_PATH, "utf-8")
      );

      console.log(`Found ${videosData.length} videos to import`);

      for (const video of videosData) {
        await db
          .insert(schema.videos)
          .values({
            videoId: video.videoId,
            title: video.title,
            publishedAt: new Date(video.publishedAt),
            source: "video",
            fileName: video.fileName || null,
            bangCount: video.bang_count || 0,
            bangs: video.bangs || [],
          })
          .onConflictDoUpdate({
            target: schema.videos.videoId,
            set: {
              title: video.title,
              bangCount: video.bang_count || 0,
              bangs: video.bangs || [],
              updatedAt: new Date(),
            },
          });
      }

      console.log(`Imported ${videosData.length} videos`);
    } else {
      console.log("Videos JSON file not found at:", VIDEOS_JSON_PATH);
    }

    // Import VODs
    if (fs.existsSync(VODS_JSON_PATH)) {
      console.log("\nImporting VODs from:", VODS_JSON_PATH);
      const vodsData: OldVideoRecord[] = JSON.parse(
        fs.readFileSync(VODS_JSON_PATH, "utf-8")
      );

      console.log(`Found ${vodsData.length} VODs to import`);

      for (const vod of vodsData) {
        await db
          .insert(schema.videos)
          .values({
            videoId: vod.videoId,
            title: vod.title,
            publishedAt: new Date(vod.publishedAt),
            source: "vod",
            fileName: vod.fileName || null,
            bangCount: vod.bang_count || 0,
            bangs: vod.bangs || [],
          })
          .onConflictDoUpdate({
            target: schema.videos.videoId,
            set: {
              title: vod.title,
              bangCount: vod.bang_count || 0,
              bangs: vod.bangs || [],
              updatedAt: new Date(),
            },
          });
      }

      console.log(`Imported ${vodsData.length} VODs`);
    } else {
      console.log("VODs JSON file not found at:", VODS_JSON_PATH);
    }

    console.log("\nData import complete!");
  } catch (error) {
    console.error("Error importing data:", error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

importData();
