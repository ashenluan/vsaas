import { existsSync, readFileSync } from 'node:fs';

if (existsSync('apps/api/prisma')) {
  throw new Error('Legacy Prisma directory still exists');
}

const apiPackageJson = JSON.parse(readFileSync('apps/api/package.json', 'utf8'));

for (const scriptName of ['db:migrate', 'db:push', 'db:seed', 'db:generate']) {
  if (!apiPackageJson.scripts?.[scriptName]?.includes('@vsaas/database')) {
    throw new Error(`${scriptName} must delegate to @vsaas/database`);
  }
}
