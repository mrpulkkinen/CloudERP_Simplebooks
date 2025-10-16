import { createServer } from './server.js';

const port = Number(process.env.PORT) || 5010;

async function start() {
  const app = await createServer();
  app.listen(port, () => {
    console.log(`API listening on port ${port}`);
  });
}

start().catch((error) => {
  console.error('Failed to start API server', error);
  process.exit(1);
});
