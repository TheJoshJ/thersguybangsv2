import { Hono } from "hono";
import transcripts from "./transcripts.js";
import live from "./live.js";

export const routes = new Hono();

// Mount all API routes
routes.route("/transcripts", transcripts);
routes.route("/live", live);
