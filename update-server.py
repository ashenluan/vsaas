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

        print("\n=== Rebuilding web + api ===")
        code, _, _ = run_cmd(
            ssh,
            f"cd {DEPLOY_DIR} && {COMPOSE} build web api",
            timeout=900,
        )
        if code != 0:
            print("Web/API build failed!")
            raise SystemExit(1)

        print("\n=== Restarting web + api ===")
        code, _, _ = run_cmd(
            ssh,
            f"cd {DEPLOY_DIR} && {COMPOSE} up -d web api",
            timeout=180,
        )
        if code != 0:
            print("Web/API restart failed!")
            raise SystemExit(1)

        time.sleep(5)
        run_cmd(ssh, f"cd {DEPLOY_DIR} && {COMPOSE} ps")
        run_smoke_check()
    finally:
        ssh.close()

    print("\n=== Done ===")


if __name__ == "__main__":
    main()
