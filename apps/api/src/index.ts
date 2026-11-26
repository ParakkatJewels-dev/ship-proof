import { createApp } from "./createApp.js";

/**
 * Entry point for Vercel: the Express app runs as a Vercel Function. There is no long-running server,
 * so the background jobs run as Vercel Cron calls to /api/cron/* (see vercel.json), and the camera
 * device reports its status over HTTP instead of a WebSocket.
 *
 * For running the API on your own computer, use local.ts (npm run dev).
 */
const app = createApp();

export default app;
