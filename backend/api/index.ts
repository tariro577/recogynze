/**
 * Vercel serverless entry point.
 *
 * Vercel runs the backend as an on-demand function rather than a long-lived
 * server, so instead of app.listen() (see src/app.ts) we export the configured
 * Express app. The catch-all rewrite in vercel.json sends every request to this
 * single function with its original URL intact, so Express's own routing
 * (/health and /api/*) works for paths of any depth.
 */
import { createApp } from '../src/server';

export default createApp();
