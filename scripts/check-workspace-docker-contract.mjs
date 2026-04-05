import { readFileSync } from 'node:fs';

function read(path) {
  return readFileSync(path, 'utf8');
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const adminDockerfile = read('apps/admin/Dockerfile');
const adminPackageJson = JSON.parse(read('apps/admin/package.json'));

if (adminPackageJson.dependencies?.['@vsaas/shared-types']) {
  assert(
    adminDockerfile.includes('COPY packages/shared-types/package.json ./packages/shared-types/'),
    'apps/admin/Dockerfile must copy packages/shared-types/package.json for workspace installs',
  );
  assert(
    adminDockerfile.includes('COPY packages/shared-types/ ./packages/shared-types/'),
    'apps/admin/Dockerfile must copy packages/shared-types/ into the build stage',
  );
}

console.log('Workspace Docker contract checks passed.');
