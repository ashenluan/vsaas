import { readFileSync } from 'node:fs';

function read(path) {
  return readFileSync(path, 'utf8');
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const migrationFiles = [
  '.github/workflows/deploy.yml',
  'infrastructure/scripts/deploy.sh',
  'redeploy.py',
  'update-server.py',
];

for (const file of migrationFiles) {
  const content = read(file);
  assert(
    !content.includes('pnpm --filter @vsaas/database migrate:prod'),
    `${file} still depends on pnpm inside the api runtime container`,
  );
  assert(
    content.includes('prisma migrate deploy'),
    `${file} must invoke prisma migrate deploy during deployment`,
  );
  assert(
    content.includes('packages/database/src/schema.prisma'),
    `${file} must target packages/database/src/schema.prisma`,
  );
}

const batchNavFiles = [
  'apps/web/src/app/(dashboard)/layout.tsx',
  'apps/web/update-layout.js',
  'apps/web/generate-layout.js',
  'apps/web/update-workspace.js',
];

for (const file of batchNavFiles) {
  const content = read(file);
  assert(
    content.includes('/digital-human/dh-batch-v2'),
    `${file} must route the 批量混剪 entry to /digital-human/dh-batch-v2`,
  );
  assert(
    !content.includes('/digital-human/compose'),
    `${file} still references the removed /digital-human/compose route`,
  );
}

const generationPage = read('apps/web/src/components/generation/model-generation-page.tsx');
assert(
  !generationPage.includes("useState<'mine' | 'public'>('mine')"),
  'ModelGenerationPage should not expose a fake public history state',
);
assert(
  !generationPage.includes("(['mine', 'public'] as const)"),
  'ModelGenerationPage should not render the fake mine/public tabs',
);
assert(
  !generationPage.includes("{tab === 'mine' ? '我的' : '公共'}"),
  'ModelGenerationPage should not label a non-functional 公共 tab',
);

const adminOrdersPage = read('apps/admin/src/app/dashboard/orders/page.tsx');
assert(
  !adminOrdersPage.includes('order.amount / 100'),
  'Admin orders page must not treat Decimal yuan amounts as fen',
);
assert(
  adminOrdersPage.includes('formatOrderAmount('),
  'Admin orders page must format Decimal/string order amounts through formatOrderAmount',
);

console.log('P0 contract checks passed.');
