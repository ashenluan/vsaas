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
MIGRATE_COMMAND = (
    "sh -lc 'cd /app && ./node_modules/.bin/prisma migrate deploy "
    "--schema packages/database/src/schema.prisma'"
)


def require_env(name):
    value = os.environ.get(name)
    if not value:
        raise SystemExit(f"Missing required environment variable: {name}")
    return value


def ssh_exec(client, cmd, timeout=600):
    print(f"\n>>> {cmd}")
    _, stdout, stderr = client.exec_command(cmd, timeout=timeout)
    out = stdout.read().decode("utf-8", errors="replace")
    err = stderr.read().decode("utf-8", errors="replace")
    exit_code = stdout.channel.recv_exit_status()
    if out.strip():
        display = out[-3000:] if len(out) > 3000 else out
        print(display)
    if err.strip():
        display = err[-1500:] if len(err) > 1500 else err
        print(f"STDERR: {display}")
    print(f"[exit: {exit_code}]")
    return exit_code, out, err


def run_smoke_check():
    print("\n===== Step 6: Smoke check =====")
    result = subprocess.run([sys.executable, "check-production-flow.py"])
    if result.returncode != 0:
        raise SystemExit(result.returncode)


def main():
    host = require_env("VSAAS_DEPLOY_HOST")
    user = require_env("VSAAS_DEPLOY_USER")
    password = require_env("VSAAS_DEPLOY_PASSWORD")

    client = paramiko.SSHClient()
    client.load_system_host_keys()
    client.set_missing_host_key_policy(paramiko.RejectPolicy())

    print(f"Connecting to {host}...")
    client.connect(host, username=user, password=password, timeout=15)
    print("Connected!")

    try:
        print("\n===== Step 1: Git pull =====")
        code, _, _ = ssh_exec(client, f"cd {DEPLOY_DIR} && git pull origin master")
        if code != 0:
            print("ERROR: git pull failed")
            raise SystemExit(1)

        print("\n===== Step 2: Docker rebuild =====")
        print("This will take 5-10 minutes...")
        code, _, _ = ssh_exec(
            client,
            f"cd {DEPLOY_DIR} && {COMPOSE} up -d --build web api 2>&1",
            timeout=900,
        )
        if code != 0:
            print("ERROR: docker compose failed")
            raise SystemExit(1)

        print("\n===== Step 3: Check containers =====")
        time.sleep(5)
        ssh_exec(client, f"cd {DEPLOY_DIR} && {COMPOSE} ps")

        print("\n===== Step 4: Database migration =====")
        time.sleep(10)
        code, _, _ = ssh_exec(
            client,
            f"cd {DEPLOY_DIR} && {COMPOSE} exec -T api {MIGRATE_COMMAND} 2>&1",
            timeout=180,
        )
        if code != 0:
            print("ERROR: database migration failed")
            raise SystemExit(1)

        print("\n===== Step 5: Quick verify =====")
        time.sleep(5)
        ssh_exec(
            client, "curl -s http://127.0.0.1:4000/api/health || echo API_NOT_READY"
        )
        ssh_exec(
            client,
            'curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3000/workspace || echo WEB_NOT_READY',
        )
        ssh_exec(client, f"cd {DEPLOY_DIR} && {COMPOSE} ps")
        ssh_exec(client, f"cd {DEPLOY_DIR} && {COMPOSE} logs --tail 30 api")
    finally:
        client.close()

    run_smoke_check()
    print("\n===== Redeployment Complete =====")


if __name__ == "__main__":
    main()
