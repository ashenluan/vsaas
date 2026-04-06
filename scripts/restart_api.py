try:
    from scripts._prod_ssh import configure_utf8_stdout, create_ssh_client
except ModuleNotFoundError:
    from _prod_ssh import configure_utf8_stdout, create_ssh_client

configure_utf8_stdout()
ssh = create_ssh_client()

def run(cmd):
    _, o, e = ssh.exec_command(cmd, timeout=120)
    return o.read().decode(errors='replace') + e.read().decode(errors='replace')

# Read docker-compose.prod.yml to understand how env is passed
print('=== docker-compose.prod.yml ===')
print(run('cat /www/wwwroot/vsaas/docker-compose.prod.yml'))

# Restart API container to pick up new .env
print('\n=== Restarting API ===')
print(run('cd /www/wwwroot/vsaas && docker compose -f docker-compose.prod.yml up -d api'))

# Verify CORS is now https
import time
time.sleep(5)
print('\n=== Verify CORS in running container ===')
print(run('docker exec vsaas-api printenv CORS_ORIGIN'))
print(run('docker exec vsaas-api printenv WS_CORS_ORIGIN'))
print(run('docker exec vsaas-api printenv APP_URL'))

# Test CORS preflight
print('\n=== CORS preflight test ===')
print(run('curl -sk -I -X OPTIONS -H "Origin: https://a.newcn.cc" -H "Access-Control-Request-Method: POST" https://a.newcn.cc/api/auth/login 2>/dev/null | head -15'))

ssh.close()
