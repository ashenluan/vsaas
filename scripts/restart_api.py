import paramiko, sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('47.103.96.48', username='root', password='Shibushia@521')

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
