import { Hono } from "hono";

export const routes = new Hono();

// Example API route
routes.get("/hello", (c) => {
  return c.json({ message: "Hello from Hono!" });
});

// Add more routes here as needed
// import users from "./users.js";
// routes.route("/users", users);
