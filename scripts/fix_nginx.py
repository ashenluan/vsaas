import sys

try:
    from scripts._prod_ssh import create_ssh_client
except ModuleNotFoundError:
    from _prod_ssh import create_ssh_client

ssh = create_ssh_client()

# Clear ALL nginx caches aggressively
print('=== Clearing nginx caches ===')
cmds = [
    'rm -rf /www/server/nginx/proxy_cache_dir/*',
    'rm -rf /tmp/nginx_cache/*',
    'find /www/server/nginx/ -name "proxy_temp" -type d -exec rm -rf {} + 2>/dev/null; true',
]
for cmd in cmds:
    _, o, e = ssh.exec_command(cmd)
    o.read()
    e.read()
print('Caches cleared')

# Check web container health
print('\n=== Web container status ===')
_, o, _ = ssh.exec_command('docker ps | grep web')
result = o.read().decode(errors='replace')
print(result.strip() or 'NOT RUNNING')

# Check if web is responding
print('\n=== Web health check ===')
_, o, _ = ssh.exec_command('curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/')
print('Status code:', o.read().decode().strip())

# Check API health
print('\n=== API health check ===')
_, o, _ = ssh.exec_command('curl -s -o /dev/null -w "%{http_code}" http://localhost:4000/api/health 2>/dev/null || curl -s -o /dev/null -w "%{http_code}" http://localhost:4000/')
print('Status code:', o.read().decode().strip())

# Reload nginx
print('\n=== Reloading nginx ===')
_, o, e = ssh.exec_command('nginx -s reload 2>&1 || /www/server/nginx/sbin/nginx -s reload 2>&1')
print(o.read().decode(errors='replace').strip())
print(e.read().decode(errors='replace').strip())

# Check recent web logs for errors
print('\n=== Recent web errors ===')
_, o, _ = ssh.exec_command('docker logs vsaas-web --since 120s 2>&1 | grep -i -E "error|warn|fail" | tail -10')
result = o.read().decode(errors='replace').strip()
print(result or '(no errors)')

ssh.close()
