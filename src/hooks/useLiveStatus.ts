import { useQuery } from "@tanstack/react-query";

export interface LiveStatus {
  live: boolean;
  error?: string;
}

const fetchLiveStatus = async (): Promise<LiveStatus> => {
  const response = await fetch("/api/v1/live");
  if (!response.ok) {
    throw new Error("Failed to fetch live status");
  }
  return response.json();
};

export function useLiveStatus() {
  return useQuery({
    queryKey: ["liveStatus"],
    queryFn: fetchLiveStatus,
    refetchInterval: 60000, // Check every minute
    staleTime: 30000, // Consider data stale after 30 seconds
  });
}
