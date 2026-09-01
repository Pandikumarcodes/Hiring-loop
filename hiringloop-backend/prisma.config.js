import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    // Keep CLI validation/generation usable without requiring local credentials.
    url: process.env.DATABASE_URL ?? '',
  },
});
