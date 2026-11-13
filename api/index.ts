// Vercel serverless entrypoint: the whole Express API runs as one function.
// vercel.json rewrites /api/* here; Express still sees the original path.
import { createApp } from "../server/src/app.js";

export default createApp();
