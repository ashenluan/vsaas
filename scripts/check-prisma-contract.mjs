import { existsSync, readFileSync } from 'node:fs';

if (existsSync('apps/api/prisma')) {
  throw new Error('Legacy Prisma directory still exists');
}

const apiPackageJson = JSON.parse(readFileSync('apps/api/package.json', 'utf8'));
const databaseEntry = readFileSync('packages/database/src/index.ts', 'utf8');

for (const scriptName of ['db:migrate', 'db:push', 'db:seed', 'db:generate']) {
  if (!apiPackageJson.scripts?.[scriptName]?.includes('@vsaas/database')) {
    throw new Error(`${scriptName} must delegate to @vsaas/database`);
  }
}

if (databaseEntry.includes("export type * from '@prisma/client'")) {
  throw new Error('@vsaas/database entry must stay runtime-safe for Node 20');
}
