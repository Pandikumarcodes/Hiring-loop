import { Client } from 'pg';

const value = process.env.TEST_DATABASE_URL;
if (!value) throw new Error('TEST_DATABASE_URL is required');
const url = new URL(value);
const databaseName = decodeURIComponent(url.pathname).replace(/^\//, '');
if (databaseName !== 'hiringloop_test') {
  throw new Error(
    `Refusing destructive reset for ${databaseName || 'no database'}`,
  );
}

console.log(`Resolved safe database name: ${databaseName}`);
url.pathname = '/postgres';
const client = new Client({ connectionString: url.toString() });
await client.connect();
await client.query(
  'SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1 AND pid <> pg_backend_pid()',
  [databaseName],
);
await client.query('DROP DATABASE IF EXISTS "hiringloop_test"');
await client.query('CREATE DATABASE "hiringloop_test"');
await client.end();
console.log('Reset completed for hiringloop_test only');
