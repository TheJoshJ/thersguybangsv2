import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../db/schema.js";
import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import os from "os";

// YouTube API configuration
const API_KEY = process.env.YOUTUBE_API_KEY;
const VIDEO_CHANNEL_ID = "UCvxL35ecfNtxY7xxAM6MWLA"; // TheRSGuy's Channel ID
const VOD_CHANNEL_ID = "UCTTzF0_-1oz4nGY132qNkLA"; // TheRSGuyVods

interface YouTubeVideo {
  videoId: string;
  title: string;
  publishedAt: string;
}

interface YouTubeChannelResponse {
  items: Array<{
    contentDetails: {
      relatedPlaylists: {
        uploads: string;
      };
    };
  }>;
}

interface YouTubePlaylistResponse {
  items: Array<{
    snippet: {
      resourceId: {
        videoId: string;
      };
      title: string;
      publishedAt: string;
    };
  }>;
  nextPageToken?: string;
}

interface TimestampEntry {
  timestamp: number;
  transcript: string;
}

// Count occurrences of "bang" (case-insensitive) in text
function countBangOccurrences(text: string): number {
  return (text.match(/\b\w*[Bb]ang\w*\b/gi) || []).length;
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

// Parse VTT/SRT format to extract timestamps and text
function parseSubtitles(content: string): Array<{ start: number; text: string }> {
  const entries: Array<{ start: number; text: string }> = [];
  const lines = content.split("\n");

  // Simple VTT/SRT parser
  let currentStart: number | null = null;
  let currentText = "";

  for (const line of lines) {
    // Match timestamp lines (VTT format: 00:00:00.000 --> 00:00:00.000)
    const timestampMatch = line.match(
      /(\d{2}):(\d{2}):(\d{2})[.,](\d{3})\s*-->/
    );
    if (timestampMatch) {
      // Save previous entry
      if (currentStart !== null && currentText.trim()) {
        const cleanedText = cleanVttText(currentText);
        if (cleanedText) {
          entries.push({ start: currentStart, text: cleanedText });
        }
      }
      // Parse new timestamp
      const hours = parseInt(timestampMatch[1]);
      const minutes = parseInt(timestampMatch[2]);
      const seconds = parseInt(timestampMatch[3]);
      currentStart = hours * 3600 + minutes * 60 + seconds;
      currentText = "";
    } else if (
      currentStart !== null &&
      line.trim() &&
      !line.match(/^\d+$/) &&
      !line.startsWith("WEBVTT")
    ) {
      // Accumulate text (skip numeric cue IDs and WEBVTT header)
      currentText += (currentText ? " " : "") + line.trim();
    }
  }

  // Don't forget the last entry
  if (currentStart !== null && currentText.trim()) {
    const cleanedText = cleanVttText(currentText);
    if (cleanedText) {
      entries.push({ start: currentStart, text: cleanedText });
    }
  }

  return entries;
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

      // Check for significant word overlap (e.g., "Bang. Oh let's go" vs "let's go. We got")
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

// Extract bang timestamps from parsed subtitles
function extractBangTimestamps(
  subtitles: Array<{ start: number; text: string }>
): TimestampEntry[] {
  const bangs: TimestampEntry[] = [];

  for (const entry of subtitles) {
    if (/\b\w*[Bb]ang\w*\b/.test(entry.text)) {
      bangs.push({
        timestamp: entry.start,
        transcript: entry.text,
      });
    }
  }

  // Deduplicate overlapping entries
  return deduplicateBangs(bangs);
}

// Fetch captions using yt-dlp
function fetchCaptionsWithYtDlp(videoId: string): string | null {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "ytdlp-"));
  const outputPath = path.join(tempDir, videoId);

  try {
    // Run yt-dlp to download auto-generated English subtitles
    execSync(
      `yt-dlp --write-auto-sub --sub-lang en --skip-download --sub-format vtt -o "${outputPath}" "https://www.youtube.com/watch?v=${videoId}"`,
      { stdio: "pipe", timeout: 60000 }
    );

    // Look for the subtitle file
    const files = fs.readdirSync(tempDir);
    const subtitleFile = files.find(
      (f) => f.endsWith(".vtt") || f.endsWith(".srt")
    );

    if (subtitleFile) {
      const content = fs.readFileSync(
        path.join(tempDir, subtitleFile),
        "utf-8"
      );
      return content;
    }

    return null;
  } catch (error) {
    console.error(`Failed to fetch captions for ${videoId}:`, error);
    return null;
  } finally {
    // Clean up temp directory
    try {
      fs.rmSync(tempDir, { recursive: true });
    } catch {
      // Ignore cleanup errors
    }
  }
}

// Fetch uploads playlist ID from YouTube API
async function getUploadsPlaylistId(channelId: string): Promise<string> {
  if (!API_KEY) {
    throw new Error("YOUTUBE_API_KEY is not set in .env");
  }

  const url = `https://www.googleapis.com/youtube/v3/channels?part=contentDetails&id=${channelId}&key=${API_KEY}`;
  const response = await fetch(url);
  const data = (await response.json()) as YouTubeChannelResponse & { error?: { message: string } };

  if (data.error) {
    throw new Error(`YouTube API error: ${data.error.message}`);
  }

  if (!data.items || data.items.length === 0) {
    throw new Error(`No channel found for ID: ${channelId}`);
  }

  return data.items[0].contentDetails.relatedPlaylists.uploads;
}

// Fetch all videos from a playlist
async function getAllVideos(playlistId: string): Promise<YouTubeVideo[]> {
  const videos: YouTubeVideo[] = [];
  let nextPageToken = "";

  do {
    const url = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${playlistId}&maxResults=50&pageToken=${nextPageToken}&key=${API_KEY}`;
    const response = await fetch(url);
    const data = (await response.json()) as YouTubePlaylistResponse;

    for (const item of data.items) {
      videos.push({
        videoId: item.snippet.resourceId.videoId,
        title: item.snippet.title,
        publishedAt: item.snippet.publishedAt,
      });
    }

    nextPageToken = data.nextPageToken || "";
  } while (nextPageToken);

  return videos;
}

async function generateBangs() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    console.error("DATABASE_URL environment variable is not set");
    process.exit(1);
  }

  if (!API_KEY) {
    console.error("YOUTUBE_API_KEY environment variable is not set");
    process.exit(1);
  }

  const client = postgres(connectionString);
  const db = drizzle(client, { schema });

  console.log("Starting bang generation...\n");

  try {
    // Get existing video IDs from database
    const existingVideos = await db
      .select({ videoId: schema.videos.videoId })
      .from(schema.videos);
    const existingIds = new Set(existingVideos.map((v) => v.videoId));

    // Process regular videos
    console.log("Fetching regular videos from YouTube...");
    const videoPlaylistId = await getUploadsPlaylistId(VIDEO_CHANNEL_ID);
    const allVideos = await getAllVideos(videoPlaylistId);
    const newVideos = allVideos.filter((v) => !existingIds.has(v.videoId));

    console.log(`Found ${newVideos.length} new videos to process`);

    for (const video of newVideos) {
      console.log(`Processing: ${video.title}`);

      const captions = fetchCaptionsWithYtDlp(video.videoId);

      if (captions) {
        const subtitles = parseSubtitles(captions);
        const fullText = subtitles.map((s) => s.text).join(" ");
        const bangCount = countBangOccurrences(fullText);
        const bangs = extractBangTimestamps(subtitles);

        await db.insert(schema.videos).values({
          videoId: video.videoId,
          title: video.title,
          publishedAt: new Date(video.publishedAt),
          source: "video",
          bangCount,
          bangs,
        });

        console.log(`  -> ${bangCount} bangs`);
      } else {
        // Insert with zero counts if no captions
        await db.insert(schema.videos).values({
          videoId: video.videoId,
          title: video.title,
          publishedAt: new Date(video.publishedAt),
          source: "video",
          bangCount: 0,
          bangs: [],
        });
        console.log(`  -> No captions available`);
      }
    }

    // Process VODs
    console.log("\nFetching VODs from YouTube...");
    const vodPlaylistId = await getUploadsPlaylistId(VOD_CHANNEL_ID);
    const allVods = await getAllVideos(vodPlaylistId);
    const newVods = allVods.filter((v) => !existingIds.has(v.videoId));

    console.log(`Found ${newVods.length} new VODs to process`);

    for (const vod of newVods) {
      console.log(`Processing: ${vod.title}`);

      const captions = fetchCaptionsWithYtDlp(vod.videoId);

      if (captions) {
        const subtitles = parseSubtitles(captions);
        const fullText = subtitles.map((s) => s.text).join(" ");
        const bangCount = countBangOccurrences(fullText);
        const bangs = extractBangTimestamps(subtitles);

        await db.insert(schema.videos).values({
          videoId: vod.videoId,
          title: vod.title,
          publishedAt: new Date(vod.publishedAt),
          source: "vod",
          bangCount,
          bangs,
        });

        console.log(`  -> ${bangCount} bangs`);
      } else {
        await db.insert(schema.videos).values({
          videoId: vod.videoId,
          title: vod.title,
          publishedAt: new Date(vod.publishedAt),
          source: "vod",
          bangCount: 0,
          bangs: [],
        });
        console.log(`  -> No captions available`);
      }
    }

    console.log("\nBang generation complete!");
  } catch (error) {
    console.error("Error generating bangs:", error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

generateBangs();
