import { Hono } from "hono";
import bangs from "./bangs.js";
import videos from "./videos.js";
import vods from "./vods.js";
import live from "./live.js";

export const routes = new Hono();

// Mount all API routes
routes.route("/bangs", bangs);
routes.route("/videos", videos);
routes.route("/vods", vods);
routes.route("/live", live);
