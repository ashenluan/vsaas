import io
import json
import os
import sys
import uuid
from typing import Any, Optional

import paramiko

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

HOST = os.environ.get("VSAAS_DEPLOY_HOST")
USER = os.environ.get("VSAAS_DEPLOY_USER")
PASS = os.environ.get("VSAAS_DEPLOY_PASSWORD")
DEPLOY_DIR = "/www/wwwroot/vsaas"
COMPOSE = "docker compose --env-file .env.production -f docker-compose.prod.yml"
LOGIN_EMAIL = os.environ.get("VSAAS_DEMO_EMAIL")
LOGIN_PASSWORD = os.environ.get("VSAAS_DEMO_PASSWORD")


def require_env(name):
    value = os.environ.get(name)
    if not value:
        raise SystemExit(f"Missing required environment variable: {name}")
    return value


def ssh_exec(client: paramiko.SSHClient, cmd: str, timeout: int = 120):
    print(f"\n>>> {cmd}")
    _, stdout, stderr = client.exec_command(cmd, timeout=timeout)
    out = stdout.read().decode("utf-8", errors="replace")
    err = stderr.read().decode("utf-8", errors="replace")
    exit_code = stdout.channel.recv_exit_status()
    if out.strip():
        print(out[-3000:] if len(out) > 3000 else out)
    if err.strip():
        print(f"STDERR: {err[-1500:] if len(err) > 1500 else err}")
    print(f"[exit: {exit_code}]")
    return exit_code, out, err


def curl_to_file(
    client: paramiko.SSHClient,
    url: str,
    token: Optional[str] = None,
    method: str = "GET",
    data: Optional[str] = None,
):
    remote_path = f"/tmp/vsaas-smoke-{uuid.uuid4().hex}.json"
    parts = [
        "curl",
        "-s",
        "-o",
        remote_path,
        "-w",
        '"%{http_code}"',
    ]
    if method != "GET":
        parts.extend(["-X", method])
    if token:
        parts.extend(["-H", f'"Authorization: Bearer {token}"'])
    if data is not None:
        parts.extend(["-H", '"Content-Type: application/json"', "-d", f"'{data}'"])
    parts.append(f'"{url}"')
    cmd = f'STATUS=$({" ".join(parts)}); echo "$STATUS"'
    code, out, _ = ssh_exec(client, cmd)
    if code != 0:
        ssh_exec(client, f'rm -f "{remote_path}"')
        raise RuntimeError(f"request failed for {url}")

    status = out.strip().splitlines()[-1]
    sftp = client.open_sftp()
    try:
        with sftp.file(remote_path, "r") as remote_file:
            body = remote_file.read().decode("utf-8", errors="replace")
    finally:
        sftp.remove(remote_path)
        sftp.close()

    return status, body


def require_status(
    client: paramiko.SSHClient, label: str, url: str, token: Optional[str] = None
):
    status, _ = curl_to_file(client, url, token=token)
    print(f"{label}:{status}")
    if status != "200":
        raise RuntimeError(f"{label} failed")


def fetch_json(
    client: paramiko.SSHClient, label: str, url: str, token: Optional[str] = None
) -> Any:
    status, body = curl_to_file(client, url, token=token)
    print(f"{label}:{status}")
    if status != "200":
        raise RuntimeError(f"{label} failed")

    if not body.strip():
        raise RuntimeError(f"{label} returned no JSON body")
    try:
        return json.loads(body)
    except json.JSONDecodeError as exc:
        raise RuntimeError(f"{label} returned invalid JSON") from exc


def extract_first_material_id(payload: Any) -> str:
    candidates = (
        payload
        if isinstance(payload, list)
        else payload.get("items")
        if isinstance(payload, dict)
        else None
    )
    if not isinstance(candidates, list):
        raise RuntimeError("materials response did not contain a list")

    for item in candidates:
        if isinstance(item, dict):
            for key in ("id", "materialId", "avatarId"):
                value = item.get(key)
                if value:
                    return str(value)

    raise RuntimeError("no material/avatar id found in materials response")


def login_and_get_token(client: paramiko.SSHClient) -> str:
    payload = json.dumps({"email": LOGIN_EMAIL, "password": LOGIN_PASSWORD})
    status, body = curl_to_file(
        client,
        "http://127.0.0.1:4000/api/auth/login",
        method="POST",
        data=payload,
    )
    print(f"login:{status}")
    if status not in {"200", "201"}:
        raise RuntimeError("login failed")

    if not body.strip():
        raise RuntimeError("login returned no JSON body")

    login_data = json.loads(body)
    token = login_data.get("accessToken")
    if not token:
        raise RuntimeError("login response missing accessToken")
    return token


def check_recent_web_logs(client: paramiko.SSHClient):
    cmd = (
        f"cd {DEPLOY_DIR} && {COMPOSE} logs --tail 120 web | "
        'python3 -c "import sys; '
        "log=sys.stdin.read(); "
        "bad=('clientReferenceManifest', 'TypeError', 'ReferenceError', 'Unhandled Runtime Error', 'Cannot find module', 'Error:'); "
        "matches=[line for line in log.splitlines() if any(flag in line for flag in bad)]; "
        "print('web-log-lines:', len(log.splitlines())); "
        "print('web-log-suspects:', len(matches)); "
        "print('\\n'.join(matches[-20:])); "
        'sys.exit(1 if matches else 0)"'
    )
    code, _, _ = ssh_exec(client, cmd, timeout=180)
    if code != 0:
        raise RuntimeError("web logs contain route crash signals")


def main():
    host = require_env("VSAAS_DEPLOY_HOST")
    user = require_env("VSAAS_DEPLOY_USER")
    password = require_env("VSAAS_DEPLOY_PASSWORD")
    require_env("VSAAS_DEMO_EMAIL")
    require_env("VSAAS_DEMO_PASSWORD")

    client = paramiko.SSHClient()
    client.load_system_host_keys()
    client.set_missing_host_key_policy(paramiko.RejectPolicy())

    print(f"Connecting to {host}...")
    client.connect(host, username=user, password=password, timeout=15)
    print("Connected!")

    try:
        require_status(client, "health", "http://127.0.0.1:4000/api/health")
        token = login_and_get_token(client)
        require_status(
            client, "profile", "http://127.0.0.1:4000/api/user/profile", token
        )
        materials = fetch_json(
            client, "materials", "http://127.0.0.1:4000/api/materials?type=IMAGE", token
        )
        require_status(client, "voices", "http://127.0.0.1:4000/api/voices", token)
        require_status(client, "scripts", "http://127.0.0.1:4000/api/scripts", token)

        material_id = extract_first_material_id(materials)
        print(f"first-material-id:{material_id}")

        require_status(client, "workspace", "http://127.0.0.1:3000/workspace")
        require_status(client, "digital-human", "http://127.0.0.1:3000/digital-human")
        require_status(
            client,
            "digital-human-create",
            f"http://127.0.0.1:3000/digital-human/create?avatarId={material_id}",
        )
        check_recent_web_logs(client)
    finally:
        client.close()

    print("\nSmoke check passed.")


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(f"\nSmoke check failed: {exc}")
        raise SystemExit(1)
