// oxlint-disable-next-line import/no-unassigned-import -- load .env before app/config imports
import 'dotenv/config';
import app from './app.js';
import { config } from './config/env.js';
import { connectDatabase, disconnectDatabase } from './database/client.js';

let server;

try {
  if (await connectDatabase()) {
    console.log('HiringLoop database connection established');
  }
  server = app.listen(config.port, () => {
    console.log(`HiringLoop backend listening on port ${config.port}`);
  });
} catch (error) {
  console.error('HiringLoop database connection failed', error);
  process.exitCode = 1;
}

async function shutdown(signal) {
  console.log(`Received ${signal}; shutting down`);
  if (!server) {
    await disconnectDatabase();
    process.exit(0);
    return;
  }
  server.close(async () => {
    await disconnectDatabase();
    process.exit(0);
  });
}

process.once('SIGINT', () => void shutdown('SIGINT'));
process.once('SIGTERM', () => void shutdown('SIGTERM'));
