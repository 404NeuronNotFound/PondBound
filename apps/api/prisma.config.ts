import { config } from 'dotenv';
import { defineConfig } from 'prisma/config';

config({ path: '.env.migrations', quiet: true });
const directUrl = process.env.DIRECT_URL;
if (directUrl) {
  const parsed = new URL(directUrl);
  if (!['postgres:', 'postgresql:'].includes(parsed.protocol)
    || decodeURIComponent(parsed.username).split('.')[0] !== 'pondbound_migrator'
    || parsed.searchParams.get('schema') !== 'game'
    || parsed.port === '6543') {
    throw new Error('DIRECT_URL must use pondbound_migrator, schema=game, and a direct/session connection (not port 6543).');
  }
  if (!['localhost', '127.0.0.1', '[::1]'].includes(parsed.hostname)
    && (parsed.searchParams.get('sslmode') !== 'require' || parsed.searchParams.get('sslaccept') !== 'strict')) {
    throw new Error('Remote Prisma migration connections require sslmode=require and sslaccept=strict.');
  }
  if (process.env.SHADOW_DATABASE_URL) {
    const shadow = new URL(process.env.SHADOW_DATABASE_URL);
    if (parsed.hostname === shadow.hostname && parsed.pathname === shadow.pathname
      && parsed.username.split('.').slice(1).join('.') === shadow.username.split('.').slice(1).join('.')) {
      throw new Error('The shadow database must be separate from the application database.');
    }
  }
}
export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations' },
  // Generation stays offline; migration commands require explicit migration credentials.
  datasource: directUrl ? { url: directUrl, shadowDatabaseUrl: process.env.SHADOW_DATABASE_URL || undefined } : undefined,
});
