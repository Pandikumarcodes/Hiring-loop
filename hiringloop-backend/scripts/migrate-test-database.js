import { spawn } from 'node:child_process';

function testDatabaseUrl() {
  const value = process.env.TEST_DATABASE_URL;

  if (!value) {
    throw new Error(
      'TEST_DATABASE_URL is required to migrate the test database',
    );
  }

  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error('TEST_DATABASE_URL must be a valid database URL');
  }

  const databaseName = decodeURIComponent(url.pathname).replace(/^\//, '');
  if (databaseName !== 'hiringloop_test') {
    throw new Error(
      `Refusing test migration: TEST_DATABASE_URL must target hiringloop_test (received ${databaseName || 'no database'})`,
    );
  }

  console.log(
    `Test migration target verified: database = ${databaseName}; host = ${url.hostname}`,
  );
  return value;
}

const command = process.argv[2] ?? 'deploy';
if (!['status', 'deploy'].includes(command)) {
  throw new Error(
    'Only Prisma migrate status and deploy are permitted by this test-only helper',
  );
}

const child = spawn(
  process.execPath,
  [
    'node_modules/prisma/build/index.js',
    'migrate',
    command,
    '--schema',
    'prisma/schema.prisma',
  ],
  {
    env: { ...process.env, DATABASE_URL: testDatabaseUrl() },
    stdio: 'inherit',
  },
);

child.on('error', (error) => {
  console.error(error.message);
  process.exitCode = 1;
});

child.on('exit', (code, signal) => {
  process.exitCode = code ?? (signal ? 1 : 0);
});
