import { config } from './config/env.js';
import app from './app.js';
import { connectDatabase, disconnectDatabase } from './database/client.js';

const server = app.listen(config.port, () => {
  console.log(`HiringLoop backend listening on port ${config.port}`);
});

if (config.databaseUrl) {
  try {
    await connectDatabase();
    console.log('HiringLoop database connection established');
  } catch (error) {
    console.error('HiringLoop database connection failed', error);
    server.close();
    process.exitCode = 1;
  }
}

async function shutdown(signal) {
  console.log(`Received ${signal}; shutting down`);
  server.close(async () => {
    await disconnectDatabase();
    process.exit(0);
  });
}

process.once('SIGINT', () => void shutdown('SIGINT'));
process.once('SIGTERM', () => void shutdown('SIGTERM'));
