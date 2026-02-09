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
  source: "video" | "vod";
}

const fetchTranscripts = async (): Promise<VideoRecord[]> => {
  const response = await fetch("/api/v1/transcripts");
  if (!response.ok) {
    throw new Error("Failed to fetch transcripts");
  }
  return response.json();
};

export function useAllVideos() {
  return useQuery({
    queryKey: ["transcripts"],
    queryFn: fetchTranscripts,
  });
}

export function useVideos() {
  return useQuery({
    queryKey: ["transcripts", "videos"],
    queryFn: async () => {
      const all = await fetchTranscripts();
      return all.filter((item) => item.source === "video");
    },
  });
}

export function useVods() {
  return useQuery({
    queryKey: ["transcripts", "vods"],
    queryFn: async () => {
      const all = await fetchTranscripts();
      return all.filter((item) => item.source === "vod");
    },
  });
}
