import dotenv from 'dotenv';
import { createApp } from './server';
import { getConfig, validateConfig } from './config';

dotenv.config();

try {
  validateConfig();
} catch (error) {
  // eslint-disable-next-line no-console
  console.error(`[recognyze] startup failed: ${(error as Error).message}`);
  process.exit(1);
}

const { port } = getConfig();
const app = createApp();

app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Recognyze API running on http://localhost:${port}`);
});
