import 'dotenv/config';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations' },
  // Placeholder allows offline generation/validation, never a claim of connectivity.
  datasource: { url: process.env.DIRECT_URL || process.env.DATABASE_URL || 'postgresql://localhost:5432/pondbound_unconfigured' },
});
