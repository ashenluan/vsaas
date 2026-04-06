import argparse
import shlex
import sys
import time

try:
    from scripts._prod_ssh import create_ssh_client, load_prod_ssh_config
except ModuleNotFoundError:
    from _prod_ssh import create_ssh_client, load_prod_ssh_config


VALID_SERVICES = ("api", "web", "admin")


def normalize_services(raw_services):
    if isinstance(raw_services, (list, tuple)):
        tokens = list(raw_services)
    else:
        raw_services = (raw_services or "all").strip()
        tokens = [part.strip() for part in raw_services.split(",") if part.strip()]

    if not tokens:
        return list(VALID_SERVICES)

    if "all" in tokens:
        if len(tokens) > 1:
            raise ValueError("`all` cannot be combined with other services.")
        return list(VALID_SERVICES)

    normalized = []
    for service in tokens:
        if service not in VALID_SERVICES:
            raise ValueError(f"Unsupported service: {service}")
        if service not in normalized:
            normalized.append(service)
    return normalized


def build_remote_deploy_script(
    services,
    repo_path="/www/wwwroot/vsaas",
    env_file=".env.production",
    domain="https://a.newcn.cc",
    internal_api_health_url="http://127.0.0.1:4000/api/health",
    public_api_health_url=None,
    wait_seconds=10,
    skip_migrate=False,
    skip_cache_clear=False,
    skip_image_prune=False,
):
    public_api_health_url = public_api_health_url or f"{domain.rstrip('/')}/api/health"
    site_health_url = f"{domain.rstrip('/')}/"
    services_arg = " ".join(services)
    prisma_cmd = (
        "cd /app/packages/database && "
        "./node_modules/.bin/prisma migrate deploy --schema src/schema.prisma"
    )

    lines = [
        "set -e",
        f"cd {shlex.quote(repo_path)}",
        "",
        'echo "=== Pull latest master ==="',
        "git pull origin master",
        "",
        f'echo "=== Rebuild services: {services_arg} ==="',
        (
            "docker compose "
            f"--env-file {shlex.quote(env_file)} "
            "-f docker-compose.prod.yml "
            f"up -d --build {services_arg}"
        ),
        "",
        'echo "=== Wait for services ==="',
        f"sleep {int(wait_seconds)}",
    ]

    if not skip_migrate:
        lines.extend(
            [
                "",
                'echo "=== Run Prisma migrate deploy ==="',
                (
                    "docker compose "
                    f"--env-file {shlex.quote(env_file)} "
                    "-f docker-compose.prod.yml "
                    f"exec -T api sh -lc {shlex.quote(prisma_cmd)}"
                ),
            ]
        )

    if not skip_cache_clear:
        lines.extend(
            [
                "",
                'echo "=== Clear Nginx cache ==="',
                "rm -rf /www/server/nginx/proxy_cache_dir/vsaas* 2>/dev/null || true",
                "/www/server/nginx/sbin/nginx -s reload 2>/dev/null || true",
            ]
        )

    lines.extend(
        [
            "",
            'echo "=== Health checks ==="',
            f"curl -sf {shlex.quote(internal_api_health_url)}",
            f"curl -I -sf {shlex.quote(site_health_url)}",
            f"curl -sf {shlex.quote(public_api_health_url)}",
            "",
            'echo "=== Docker status ==="',
            "docker compose -f docker-compose.prod.yml ps",
        ]
    )

    if not skip_image_prune:
        lines.extend(
            [
                "",
                'echo "=== Prune old images ==="',
                "docker image prune -f",
            ]
        )

    lines.extend(
        [
            "",
            'echo "=== Deploy complete ==="',
        ]
    )

    return "\n".join(lines) + "\n"


def run_remote_script(script_text, env=None):
    config = load_prod_ssh_config(env)
    ssh = create_ssh_client(config=config)

    try:
        stdin, stdout, stderr = ssh.exec_command("bash -s --", get_pty=True)
        stdin.write(script_text)
        stdin.flush()
        stdin.channel.shutdown_write()

        channel = stdout.channel
        while True:
            wrote = False
            while channel.recv_ready():
                sys.stdout.write(channel.recv(4096).decode(errors="replace"))
                sys.stdout.flush()
                wrote = True
            while channel.recv_stderr_ready():
                sys.stderr.write(channel.recv_stderr(4096).decode(errors="replace"))
                sys.stderr.flush()
                wrote = True

            if channel.exit_status_ready():
                if not wrote:
                    break
            else:
                time.sleep(0.2)

        while channel.recv_ready():
            sys.stdout.write(channel.recv(4096).decode(errors="replace"))
            sys.stdout.flush()
        while channel.recv_stderr_ready():
            sys.stderr.write(channel.recv_stderr(4096).decode(errors="replace"))
            sys.stderr.flush()

        return channel.recv_exit_status()
    finally:
        ssh.close()


def parse_args(argv=None):
    parser = argparse.ArgumentParser(
        description="Run the documented production fallback deploy over SSH."
    )
    parser.add_argument("--services", default="all", help="all or comma-separated subset")
    parser.add_argument("--repo-path", default="/www/wwwroot/vsaas")
    parser.add_argument("--env-file", default=".env.production")
    parser.add_argument("--domain", default="https://a.newcn.cc")
    parser.add_argument("--internal-api-health-url", default="http://127.0.0.1:4000/api/health")
    parser.add_argument("--public-api-health-url")
    parser.add_argument("--wait-seconds", type=int, default=10)
    parser.add_argument("--skip-migrate", action="store_true")
    parser.add_argument("--skip-cache-clear", action="store_true")
    parser.add_argument("--skip-image-prune", action="store_true")
    parser.add_argument("--print-only", action="store_true", help="Print remote bash and exit")
    return parser.parse_args(argv)


def main(argv=None):
    args = parse_args(argv)
    services = normalize_services(args.services)
    script_text = build_remote_deploy_script(
        services=services,
        repo_path=args.repo_path,
        env_file=args.env_file,
        domain=args.domain,
        internal_api_health_url=args.internal_api_health_url,
        public_api_health_url=args.public_api_health_url,
        wait_seconds=args.wait_seconds,
        skip_migrate=args.skip_migrate,
        skip_cache_clear=args.skip_cache_clear,
        skip_image_prune=args.skip_image_prune,
    )

    if args.print_only:
        sys.stdout.write(script_text)
        return 0

    exit_code = run_remote_script(script_text)
    return exit_code


if __name__ == "__main__":
    sys.exit(main())
