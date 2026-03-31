# Web Build Manifest Repro

Date: 2026-03-31
Worktree: `D:\VS code\vsaas\.worktrees\auth-dh-deploy-fix`
Branch: `fix/auth-dh-deploy`

## Environment notes

- OS: Windows
- Checkout shape: git worktree under `.worktrees/auth-dh-deploy-fix`
- Package manager: `pnpm`
- Repository shape: monorepo with `apps/web` and workspace packages
- Web app package: `@vsaas/web`
- Relevant Next mode: `output: 'standalone'`

## Reproduced failure

Production logs reported:

```text
Expected clientReferenceManifest to be defined
```

The local reproduction in the isolated worktree showed that `pnpm --filter @vsaas/web build` completed compile, type-checking, and static generation, then failed during standalone assembly.

## Exact local repro commands

Commands used from the worktree root:

```powershell
pnpm --filter @vsaas/web build
```

After the build generated output artifacts, the resulting manifest was inspected at:

```text
apps/web/.next/required-server-files.json
```

Docker availability was also checked from the same worktree:

```powershell
docker version
```

## Concrete failure signatures

The local build failed during standalone output assembly with two important signatures.

### 1. Symlink copy failures on Windows

Representative errors from `next build`:

```text
Failed to copy traced files for ...\_app.js [Error: EPERM: operation not permitted, symlink ...]
Failed to copy traced files for ...\_error.js [Error: EPERM: operation not permitted, symlink ...]
Build error occurred
[Error: EPERM: operation not permitted, symlink ...]
```

These appeared while Next was copying traced files into `.next/standalone`.

### 2. Missing client reference manifest during standalone copy

Representative error from `next build`:

```text
Failed to copy traced files for D:\VS code\vsaas\.worktrees\auth-dh-deploy-fix\apps\web\.next\server\app\(dashboard)\page.js
[Error: ENOENT: no such file or directory, copyfile
'D:\VS code\vsaas\.worktrees\auth-dh-deploy-fix\apps\web\.next\server\app\(dashboard)\page_client-reference-manifest.js'
->
'D:\VS code\vsaas\.worktrees\auth-dh-deploy-fix\apps\web\.next\standalone\apps\web\.next\server\app\(dashboard)\page_client-reference-manifest.js']
```

This missing `(dashboard)/page_client-reference-manifest.js` is consistent with the production symptom:

```text
Expected clientReferenceManifest to be defined
```

## Evidence collected

The main configuration evidence came from `apps/web/.next/required-server-files.json`.

### Before the fix

Investigation evidence showed a root mismatch in the generated manifest:

- `appDir` pointed at the worktree path under `.worktrees/auth-dh-deploy-fix`
- `outputFileTracingRoot` pointed at the parent repository root `D:\VS code\vsaas`

In concrete terms:

```text
appDir: D:\VS code\vsaas\.worktrees\auth-dh-deploy-fix\apps\web
outputFileTracingRoot: D:\VS code\vsaas
```

This meant Next was tracing server files relative to the main checkout instead of the active worktree during standalone output generation.

### After the fix

After setting `outputFileTracingRoot` explicitly in `apps/web/next.config.ts`, the generated manifest changed to:

```text
outputFileTracingRoot: D:\VS code\vsaas\.worktrees\auth-dh-deploy-fix
```

This is the expected monorepo root for the active checkout, and it now matches the worktree layout used by the build.

## Root cause summary

`apps/web/next.config.ts` did not explicitly set `outputFileTracingRoot`.
In this worktree layout, Next inferred the tracing root from the parent repository instead of the current worktree root, which corrupted the standalone build inputs and aligned with the missing manifest failure seen in production.

## Chosen minimal fix direction

Set `outputFileTracingRoot` explicitly in `apps/web/next.config.ts` to the monorepo root for the active checkout:

```ts
outputFileTracingRoot: path.join(appDir, '../..')
```

This is the chosen minimal fix for four reasons:

- it changes only tracing-root inference and does not alter application behavior
- it directly addresses the confirmed manifest mismatch observed in `required-server-files.json`
- it is worktree-safe for this monorepo layout because `appDir` is resolved from the active `next.config.ts` location
- it avoids changing Docker packaging logic before proving Docker is actually the failing layer

The key idea is that standalone tracing must be rooted at the active monorepo checkout. In a normal checkout and in a worktree, `apps/web` lives two levels below that checkout root, so `path.join(appDir, '../..')` gives the correct tracing root without introducing a broader config change.

## Dockerfile note

`apps/web/Dockerfile` was inspected during this task and left unchanged. Its standalone copy steps looked consistent with a successful Next standalone build, so it was not treated as the primary fault location.

## Verification notes

- `pnpm --filter @vsaas/web build`
  - Result: build still failed on this Windows machine during standalone assembly
  - Important positive evidence: `required-server-files.json` was generated and now shows the corrected worktree `outputFileTracingRoot`
- `docker version`
  - Result: Docker client exists, but the Docker Desktop Linux engine was not running or reachable, so a meaningful `docker build -f apps/web/Dockerfile . -t vsaas-web-task5` could not be completed in this environment
