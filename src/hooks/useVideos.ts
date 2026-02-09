import { useQuery } from "@tanstack/react-query";

export interface TimestampEntry {
  timestamp: number;
  transcript: string;
}

export interface VideoRecord {
  videoId: string;
  title: string;
  publishedAt: string;
  fileName: string | null;
  bang_count: number;
  bangs: TimestampEntry[];
  source?: "video" | "vod";
}

const fetchVideos = async (): Promise<VideoRecord[]> => {
  const response = await fetch("/api/v1/videos");
  if (!response.ok) {
    throw new Error("Failed to fetch videos");
  }
  const data = await response.json();
  return data.map((item: VideoRecord) => ({ ...item, source: "video" as const }));
};

const fetchVods = async (): Promise<VideoRecord[]> => {
  const response = await fetch("/api/v1/vods");
  if (!response.ok) {
    throw new Error("Failed to fetch VODs");
  }
  const data = await response.json();
  return data.map((item: VideoRecord) => ({ ...item, source: "vod" as const }));
};

export function useAllVideos() {
  return useQuery({
    queryKey: ["allVideos"],
    queryFn: async () => {
      const [videos, vods] = await Promise.all([fetchVideos(), fetchVods()]);
      return [...videos, ...vods];
    },
  });
}

export function useVideos() {
  return useQuery({
    queryKey: ["videos"],
    queryFn: fetchVideos,
  });
}

export function useVods() {
  return useQuery({
    queryKey: ["vods"],
    queryFn: fetchVods,
  });
}
