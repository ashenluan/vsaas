try:
    from scripts._prod_ssh import configure_utf8_stdout, create_ssh_client
except ModuleNotFoundError:
    from _prod_ssh import configure_utf8_stdout, create_ssh_client

configure_utf8_stdout()
ssh = create_ssh_client()

def run(cmd):
    _, o, e = ssh.exec_command(cmd, timeout=30)
    return o.read().decode(errors='replace') + e.read().decode(errors='replace')

# Check NEXT_PUBLIC_API_URL in .env
print('=== NEXT_PUBLIC_API_URL in .env ===')
print(run('grep NEXT_PUBLIC /www/wwwroot/vsaas/.env'))

# Check what's baked into the web container
print('=== NEXT_PUBLIC in web container ===')
print(run('docker exec vsaas-web printenv | grep -i NEXT_PUBLIC'))

# Check the actual JS bundle for API URL
print('=== API URL in built JS ===')
print(run('docker exec vsaas-web grep -r "NEXT_PUBLIC_API_URL" /app/.next/ 2>/dev/null | head -5'))
print(run('docker exec vsaas-web grep -roh "http[s]*://[a-z0-9.:]*" /app/.next/static/chunks/ 2>/dev/null | sort -u | head -20'))

# Test actual login request
print('=== Test login POST ===')
print(run('curl -sk -X POST https://a.newcn.cc/api/auth/login -H "Content-Type: application/json" -H "Origin: https://a.newcn.cc" -d \'{"email":"test@test.com","password":"test"}\' -w "\n%{http_code}" 2>/dev/null'))

# Check if there's a service worker
print('=== Check for service worker ===')
print(run('curl -sk -o /dev/null -w "%{http_code}" https://a.newcn.cc/sw.js 2>/dev/null'))

ssh.close()
