import {
  pgTable,
  serial,
  text,
  timestamp,
  integer,
  jsonb,
  varchar,
  pgEnum,
} from "drizzle-orm/pg-core";

// Enum for video source type
export const videoSourceEnum = pgEnum("video_source", ["video", "vod"]);

// Bang timestamp structure
export interface TimestampEntry {
  timestamp: number;
  transcript: string;
}

// Videos table - stores both regular videos and VODs
export const videos = pgTable("videos", {
  id: serial("id").primaryKey(),
  videoId: varchar("video_id", { length: 20 }).notNull().unique(),
  title: text("title").notNull(),
  publishedAt: timestamp("published_at").notNull(),
  source: videoSourceEnum("source").notNull().default("video"),
  fileName: text("file_name"),
  bangCount: integer("bang_count").notNull().default(0),
  bangs: jsonb("bangs").$type<TimestampEntry[]>().notNull().default([]),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Type inference for TypeScript
export type Video = typeof videos.$inferSelect;
export type NewVideo = typeof videos.$inferInsert;
