import { execSync } from 'child_process';
import 'dotenv/config';

/** Points the e2e run at the test database and brings its schema up to date. */
export default function globalSetup() {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) throw new Error('Set TEST_DATABASE_URL (a separate, disposable database) to run e2e tests.');
  process.env.DATABASE_URL = url;
  execSync('npx prisma migrate deploy', { stdio: 'inherit', env: { ...process.env, DATABASE_URL: url } });
}
