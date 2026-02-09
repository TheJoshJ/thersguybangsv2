import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../db/schema.js";
import { eq } from "drizzle-orm";

interface TimestampEntry {
  timestamp: number;
  transcript: string;
}

// Clean VTT text by removing timing codes, tags, and HTML entities
function cleanVttText(text: string): string {
  return text
    // Remove inline timing codes like <00:04:33.759>
    .replace(/<\d{2}:\d{2}:\d{2}\.\d{3}>/g, "")
    // Remove VTT cue tags like <c> and </c>
    .replace(/<\/?c>/g, "")
    // Remove any other VTT tags
    .replace(/<[^>]+>/g, "")
    // Decode HTML entities
    .replace(/&gt;/g, ">")
    .replace(/&lt;/g, "<")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    // Clean up extra whitespace
    .replace(/\s+/g, " ")
    .trim();
}

// Deduplicate bang entries that are within a time window and have overlapping text
function deduplicateBangs(bangs: TimestampEntry[]): TimestampEntry[] {
  if (bangs.length === 0) return bangs;

  // Sort by timestamp
  const sorted = [...bangs].sort((a, b) => a.timestamp - b.timestamp);
  const result: TimestampEntry[] = [];

  for (const bang of sorted) {
    // Check if this bang is a duplicate of a recent one (within 5 seconds)
    const isDuplicate = result.some((existing) => {
      const timeDiff = Math.abs(bang.timestamp - existing.timestamp);
      if (timeDiff > 5) return false;

      // Check if one transcript contains the other or they share significant overlap
      const bangLower = bang.transcript.toLowerCase();
      const existingLower = existing.transcript.toLowerCase();

      // If one contains the other, it's a duplicate
      if (bangLower.includes(existingLower) || existingLower.includes(bangLower)) {
        // Keep the longer one by updating existing if new one is longer
        if (bang.transcript.length > existing.transcript.length) {
          existing.transcript = bang.transcript;
        }
        return true;
      }

      // Check for significant word overlap
      const bangWords = bangLower.split(/\s+/);
      const existingWords = existingLower.split(/\s+/);
      const commonWords = bangWords.filter((w) => existingWords.includes(w));
      const overlapRatio = commonWords.length / Math.min(bangWords.length, existingWords.length);

      if (overlapRatio > 0.5) {
        // Keep the longer one
        if (bang.transcript.length > existing.transcript.length) {
          existing.transcript = bang.transcript;
        }
        return true;
      }

      return false;
    });

    if (!isDuplicate) {
      result.push({ ...bang });
    }
  }

  return result;
}

async function cleanTranscripts() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    console.error("DATABASE_URL environment variable is not set");
    process.exit(1);
  }

  const client = postgres(connectionString);
  const db = drizzle(client, { schema });

  console.log("Starting transcript cleanup and deduplication...\n");

  try {
    // Fetch all videos
    const videos = await db.select().from(schema.videos);
    console.log(`Found ${videos.length} videos to check\n`);

    let cleanedCount = 0;
    let totalBangsBefore = 0;
    let totalBangsAfter = 0;

    for (const video of videos) {
      const bangs = video.bangs as TimestampEntry[] | null;

      if (!bangs || bangs.length === 0) continue;

      totalBangsBefore += bangs.length;

      // Clean transcripts
      const cleanedBangs = bangs.map((bang) => ({
        timestamp: bang.timestamp,
        transcript: cleanVttText(bang.transcript),
      }));

      // Deduplicate
      const deduplicatedBangs = deduplicateBangs(cleanedBangs);

      totalBangsAfter += deduplicatedBangs.length;

      // Check if anything changed
      const changed =
        bangs.length !== deduplicatedBangs.length ||
        bangs.some((b, i) => b.transcript !== deduplicatedBangs[i]?.transcript);

      if (changed) {
        await db
          .update(schema.videos)
          .set({
            bangs: deduplicatedBangs,
            bangCount: deduplicatedBangs.length,
            updatedAt: new Date(),
          })
          .where(eq(schema.videos.id, video.id));

        cleanedCount++;
        const removed = bangs.length - deduplicatedBangs.length;
        if (removed > 0) {
          console.log(`Cleaned: ${video.title} (removed ${removed} duplicates)`);
        }
      }
    }

    console.log(`\n--- Summary ---`);
    console.log(`Processed ${cleanedCount} videos`);
    console.log(`Total bangs before: ${totalBangsBefore}`);
    console.log(`Total bangs after: ${totalBangsAfter}`);
    console.log(`Duplicates removed: ${totalBangsBefore - totalBangsAfter}`);
    console.log("\nTranscript cleanup complete!");
  } catch (error) {
    console.error("Error cleaning transcripts:", error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

cleanTranscripts();
