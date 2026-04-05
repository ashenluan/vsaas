import io
import os
import subprocess
import sys
import time

import paramiko

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

HOST = os.environ.get("VSAAS_DEPLOY_HOST")
USER = os.environ.get("VSAAS_DEPLOY_USER")
PASS = os.environ.get("VSAAS_DEPLOY_PASSWORD")
DEPLOY_DIR = "/www/wwwroot/vsaas"
COMPOSE = "docker compose --env-file .env.production -f docker-compose.prod.yml"
SERVICES = "web api admin"
MIGRATE_COMMAND = (
    "sh -lc 'cd /app/packages/database && ./node_modules/.bin/prisma "
    "migrate deploy --schema src/schema.prisma'"
)


def require_env(name):
    value = os.environ.get(name)
    if not value:
        raise SystemExit(f"Missing required environment variable: {name}")
    return value


def run_cmd(ssh, cmd, timeout=300):
    print(f"\n>>> {cmd}")
    _, stdout, stderr = ssh.exec_command(cmd, timeout=timeout)
    out = stdout.read().decode("utf-8", errors="replace")
    err = stderr.read().decode("utf-8", errors="replace")
    exit_code = stdout.channel.recv_exit_status()
    if out:
        sys.stdout.write(out)
        if not out.endswith("\n"):
            sys.stdout.write("\n")
        sys.stdout.flush()
    if err:
        sys.stderr.write(err)
        if not err.endswith("\n"):
            sys.stderr.write("\n")
        sys.stderr.flush()
    if exit_code != 0:
        print(f"[EXIT CODE: {exit_code}]")
    return exit_code, out, err


def run_smoke_check():
    print("\n=== Running smoke check ===")
    result = subprocess.run([sys.executable, "check-production-flow.py"])
    if result.returncode != 0:
        raise SystemExit(result.returncode)


def main():
    host = require_env("VSAAS_DEPLOY_HOST")
    user = require_env("VSAAS_DEPLOY_USER")
    password = require_env("VSAAS_DEPLOY_PASSWORD")

    ssh = paramiko.SSHClient()
    ssh.load_system_host_keys()
    ssh.set_missing_host_key_policy(paramiko.RejectPolicy())
    print(f"Connecting to {host}...")
    ssh.connect(host, username=user, password=password)
    print("Connected.\n")

    try:
        print("=== Pulling code ===")
        for attempt in range(5):
            code, _, _ = run_cmd(ssh, f"cd {DEPLOY_DIR} && git pull origin master")
            if code == 0:
                break
            print(f"Retry {attempt + 1}/5...")
            time.sleep(10)
        else:
            raise SystemExit(1)

        run_cmd(ssh, f"cd {DEPLOY_DIR} && git log --oneline -3")

        print("\n=== Rebuilding web + api + admin ===")
        code, _, _ = run_cmd(
            ssh,
            f"cd {DEPLOY_DIR} && {COMPOSE} build {SERVICES}",
            timeout=900,
        )
        if code != 0:
            print("Service build failed!")
            raise SystemExit(1)

        print("\n=== Restarting web + api + admin ===")
        code, _, _ = run_cmd(
            ssh,
            f"cd {DEPLOY_DIR} && {COMPOSE} up -d {SERVICES}",
            timeout=180,
        )
        if code != 0:
            print("Service restart failed!")
            raise SystemExit(1)

        print("\n=== Running database migrations ===")
        code, _, _ = run_cmd(
            ssh,
            f"cd {DEPLOY_DIR} && {COMPOSE} exec -T api {MIGRATE_COMMAND}",
            timeout=180,
        )
        if code != 0:
            print("Database migration failed!")
            raise SystemExit(1)

        print("\n=== Clearing Nginx proxy cache ===")
        run_cmd(ssh, "rm -rf /www/server/nginx/proxy_cache_dir/* && /www/server/nginx/sbin/nginx -s reload")

        time.sleep(5)
        run_cmd(ssh, f"cd {DEPLOY_DIR} && {COMPOSE} ps")
        run_cmd(ssh, "curl -s http://127.0.0.1:4000/api/health")
        run_cmd(
            ssh,
            'curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3002/login || echo ADMIN_NOT_READY',
        )
    finally:
        ssh.close()

    print("\n=== Done ===")


if __name__ == "__main__":
    main()
