import { useQuery } from "@tanstack/react-query";

export interface BangsResponse {
  total_bangs: number;
}

const fetchTotalBangs = async (): Promise<BangsResponse> => {
  const response = await fetch("/api/v1/bangs");
  if (!response.ok) {
    throw new Error("Failed to fetch bangs data");
  }
  return response.json();
};

export function useTotalBangs() {
  return useQuery({
    queryKey: ["totalBangs"],
    queryFn: fetchTotalBangs,
  });
}
