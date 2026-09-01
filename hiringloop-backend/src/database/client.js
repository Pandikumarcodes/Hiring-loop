import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

import { config } from '../config/env.js';

let prismaClient;

function getDatabaseName(databaseUrl) {
  const withoutQuery = databaseUrl.split('?')[0];
  return withoutQuery.slice(withoutQuery.lastIndexOf('/') + 1);
}

export function getTestDatabaseUrl() {
  const databaseUrl = config.testDatabaseUrl;

  if (!databaseUrl) {
    throw new Error(
      'TEST_DATABASE_URL is required for database integration tests',
    );
  }

  if (getDatabaseName(databaseUrl) !== 'hiringloop_test') {
    throw new Error('TEST_DATABASE_URL must target hiringloop_test');
  }

  return databaseUrl;
}

export function getConfiguredDatabaseUrl() {
  const databaseUrl =
    config.environment === 'test' ? getTestDatabaseUrl() : config.databaseUrl;

  if (!databaseUrl) {
    const variableName =
      config.environment === 'test' ? 'TEST_DATABASE_URL' : 'DATABASE_URL';
    throw new Error(`${variableName} is required to create a Prisma client`);
  }

  return databaseUrl;
}

export function getPrismaClient() {
  if (!prismaClient) {
    const adapter = new PrismaPg({
      connectionString: getConfiguredDatabaseUrl(),
    });

    prismaClient = new PrismaClient({ adapter });
  }

  return prismaClient;
}

export async function connectDatabase() {
  if (config.environment !== 'test' && !config.databaseUrl) {
    return false;
  }

  if (config.environment === 'test' && !config.testDatabaseUrl) {
    return false;
  }

  const client = getPrismaClient();
  await client.$connect();
  return true;
}

export async function disconnectDatabase() {
  if (prismaClient) {
    await prismaClient.$disconnect();
    prismaClient = undefined;
  }
}
