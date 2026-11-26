import express from "express";
import { createApp } from "./createApp.js";

/**
 * Entry point for Vercel: the Express app runs as a Vercel Function. There is no long-running server,
 * so the background jobs run as Vercel Cron calls to /api/cron/* (see vercel.json), and the camera
 * device reports its status over HTTP instead of a WebSocket.
 *
 * Vercel recognises an Express entry point by the file importing express itself, so the ShipProof app
 * is mounted on an app created here.
 *
 * For running the API on your own computer, use local.ts (npm run dev).
 */
const app = express();
app.disable("x-powered-by");
app.use(createApp());

export default app;
