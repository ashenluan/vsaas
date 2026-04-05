import paramiko, sys, io, time
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('47.103.96.48', username='root', password='Shibushia@521')

def run(cmd, timeout=300):
    _, o, e = ssh.exec_command(cmd, timeout=timeout)
    return o.read().decode(errors='replace') + e.read().decode(errors='replace')

# Fix NEXT_PUBLIC_API_URL from http to https
print('=== Fixing NEXT_PUBLIC_API_URL ===')
print(run('sed -i "s|NEXT_PUBLIC_API_URL=http://a.newcn.cc|NEXT_PUBLIC_API_URL=https://a.newcn.cc|g" /www/wwwroot/vsaas/.env'))
print(run('sed -i "s|API_BASE_URL=http://a.newcn.cc|API_BASE_URL=https://a.newcn.cc|g" /www/wwwroot/vsaas/.env'))

print('=== Verify .env ===')
print(run('grep -E "NEXT_PUBLIC|API_BASE_URL|CORS" /www/wwwroot/vsaas/.env'))

# Rebuild web container (NEXT_PUBLIC vars are baked at build time)
print('=== Rebuilding web container ===')
result = run('cd /www/wwwroot/vsaas && docker compose -f docker-compose.prod.yml up -d --build web', timeout=300)
print(result)

# Also restart API to pick up API_BASE_URL change
print('=== Restarting API ===')
result = run('cd /www/wwwroot/vsaas && docker compose -f docker-compose.prod.yml up -d api')
print(result)

time.sleep(8)

# Verify
print('=== Verify containers ===')
print(run('docker ps --format "{{.Names}} {{.Status}}" | grep vsaas'))

# Clear nginx cache
print('=== Clear nginx cache ===')
print(run('rm -rf /www/server/nginx/proxy_cache_dir/*'))
print(run('nginx -s reload 2>/dev/null || /www/server/nginx/sbin/nginx -s reload 2>/dev/null'))
print('Done')

ssh.close()
