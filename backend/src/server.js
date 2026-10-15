import { createServer } from 'node:http';
import app from './app.js';
import { env } from './config/env.js';
import { closeDatabasePool } from './repositories/healthRepository.js';

const server = createServer(app);
let isShuttingDown = false;

async function shutdown(signal) {
  if (isShuttingDown) return;
  isShuttingDown = true;
  console.info(`${signal} received; shutting down gracefully`);

  const forceExitTimer = setTimeout(() => {
    console.error('Graceful shutdown timed out');
    process.exit(1);
  }, 10000);
  forceExitTimer.unref();

  try {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
    await closeDatabasePool();
    clearTimeout(forceExitTimer);
    process.exitCode = 0;
  } catch (error) {
    console.error('Graceful shutdown failed:', error);
    process.exitCode = 1;
  }
}

server.listen(env.port, () => {
  console.info(`ISMS API listening on port ${env.port}`);
});

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));

export { server, shutdown };
