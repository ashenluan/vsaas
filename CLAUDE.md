# Deployment Notes

## Production Flow

- Primary production branch: `master`
- Existing auto-deploy workflow: `.github/workflows/deploy.yml`
- Auto-deploy trigger: push to `master` with changes under `apps/**`, `packages/**`, or `docker-compose.prod.yml`

## Preferred Path

1. Verify locally before pushing:
   - `node scripts/check-prisma-contract.mjs`
   - `corepack pnpm --filter @vsaas/api build`
   - Run any app-specific tests that cover the changed area
2. Push `master`:
   - `git push origin master`
3. If GitHub Actions is available, let the existing deploy workflow handle production rollout.

## Manual Fallback

Use this path when GitHub Actions is blocked but production still needs to be updated.

1. SSH to the production host with credentials provided out-of-band.
2. Deploy from `/www/wwwroot/vsaas`.
3. Pull latest `master`:
   - `git pull origin master`
4. Rebuild and restart services:
   - Full rollout: `docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build api web admin`
   - API-only fix: `docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build api`
5. Clear Nginx cache and reload:
   - `rm -rf /www/server/nginx/proxy_cache_dir/vsaas* 2>/dev/null || true`
   - `/www/server/nginx/sbin/nginx -s reload 2>/dev/null || true`
6. Run health checks:
   - `curl -sf http://127.0.0.1:4000/api/health`
   - `curl -I https://a.newcn.cc/`
   - `curl https://a.newcn.cc/api/health`

## Current Production Endpoints

- Site: `https://a.newcn.cc/`
- API health: `https://a.newcn.cc/api/health`
- Admin container port: `3002`
- API container port: `4000`
- Web container port: `3000`

## Known Caveats

- The current GitHub Actions account may be blocked by billing issues. If Actions jobs fail before any steps run, use the manual fallback.
- `deploy.yml` currently tries to run `pnpm --filter @vsaas/database migrate:prod` inside the API runtime container. That container does not include `pnpm`, so the migration step can be skipped/fail even when the rollout succeeds.
- Do not commit production passwords or secret values into the repository. Keep credentials in environment variables or out-of-band notes only.
