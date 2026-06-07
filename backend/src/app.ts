import dotenv from 'dotenv';
import { createApp } from './server';
import { getConfig } from './config';
import { getStore } from './store';

dotenv.config();

const { port } = getConfig();
const app = createApp();

// Warm the store (creates tables / seeds) so the first request isn't slow.
getStore().catch(err => {
  // eslint-disable-next-line no-console
  console.error('[recognyze] store init failed:', (err as Error).message);
});

app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Recognyze API running on http://localhost:${port}`);
});
