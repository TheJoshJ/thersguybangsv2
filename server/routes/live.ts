import { Hono } from "hono";

const live = new Hono();

// TheRSGuy's Twitch user ID
const TWITCH_USER_ID = "43094890";

interface TwitchTokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
}

interface TwitchStreamsResponse {
  data: Array<{
    id: string;
    user_id: string;
    user_login: string;
    user_name: string;
    type: string;
  }>;
}

// Get Twitch OAuth token
async function getTwitchToken(): Promise<string> {
  const clientId = process.env.TWITCH_CLIENT_ID;
  const clientSecret = process.env.TWITCH_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("Twitch credentials not configured");
  }

  const response = await fetch("https://id.twitch.tv/oauth2/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "client_credentials",
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to get Twitch token");
  }

  const data = (await response.json()) as TwitchTokenResponse;
  return data.access_token;
}

// GET /api/v1/live - Check if TheRSGuy is live on Twitch
live.get("/", async (c) => {
  try {
    const clientId = process.env.TWITCH_CLIENT_ID;

    if (!clientId) {
      return c.json({ live: false, error: "Twitch not configured" });
    }

    const token = await getTwitchToken();

    const response = await fetch(
      `https://api.twitch.tv/helix/streams?user_id=${TWITCH_USER_ID}`,
      {
        headers: {
          "Client-Id": clientId,
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error("Failed to fetch stream data");
    }

    const data = (await response.json()) as TwitchStreamsResponse;
    const isLive = Array.isArray(data.data) && data.data.length > 0;

    return c.json({ live: isLive });
  } catch (error) {
    console.error("Error checking live status:", error);
    return c.json({ live: false, error: "Failed to check live status" });
  }
});

export default live;
