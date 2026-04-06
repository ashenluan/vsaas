from dataclasses import dataclass
import io
import os
import sys


DEFAULT_HOST = "47.103.96.48"
DEFAULT_PORT = 22
DEFAULT_USER = "root"


@dataclass(frozen=True)
class ProdSshConfig:
    host: str
    port: int
    user: str
    password: str


def configure_utf8_stdout():
    if getattr(sys.stdout, "buffer", None) is None:
        return
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")


def load_prod_ssh_config(env=None):
    env = os.environ if env is None else env

    host = env.get("VSAAS_PROD_HOST", DEFAULT_HOST)
    user = env.get("VSAAS_PROD_USER", DEFAULT_USER)
    port_raw = env.get("VSAAS_PROD_PORT", str(DEFAULT_PORT))
    password = env.get("VSAAS_PROD_PASSWORD")

    if not password:
        raise RuntimeError(
            "Missing required env var: VSAAS_PROD_PASSWORD. "
            "Set VSAAS_PROD_HOST / VSAAS_PROD_USER / VSAAS_PROD_PORT as needed."
        )

    try:
        port = int(port_raw)
    except ValueError as exc:
        raise RuntimeError(
            f"Invalid VSAAS_PROD_PORT value: {port_raw!r}. Expected an integer."
        ) from exc

    return ProdSshConfig(host=host, port=port, user=user, password=password)


def create_ssh_client(config=None, env=None, timeout=20):
    try:
        import paramiko
    except ImportError as exc:
        raise RuntimeError(
            "paramiko is required for production SSH scripts. Install it with `pip install paramiko`."
        ) from exc

    config = config or load_prod_ssh_config(env)

    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(
        config.host,
        port=config.port,
        username=config.user,
        password=config.password,
        timeout=timeout,
    )
    return ssh
