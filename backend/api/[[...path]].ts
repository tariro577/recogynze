/**
 * Vercel serverless entry point.
 *
 * Vercel runs the backend as on-demand functions rather than a long-lived
 * server, so instead of app.listen() (see src/app.ts) we export the configured
 * Express app. The optional catch-all filename ([[...path]]) routes every
 * request under /api/* (and /api itself) into this single function.
 *
 * Required environment variables must be set in the Vercel project settings —
 * createApp() validates them and the function will fail loudly if any are missing.
 */
import { createApp } from '../src/server';

export default createApp();
