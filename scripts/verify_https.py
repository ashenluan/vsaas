import paramiko, sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('47.103.96.48', username='root', password='Shibushia@521')

def run(cmd):
    _, o, e = ssh.exec_command(cmd, timeout=30)
    return o.read().decode(errors='replace') + e.read().decode(errors='replace')

# Verify HTTPS in built JS
print('=== Check API URL in login page JS ===')
result = run('curl -sk https://a.newcn.cc/login 2>/dev/null | grep -oP "https?://a\.newcn\.cc" | sort -u')
print(result or '(not found in HTML)')

# Check CORS preflight
print('=== CORS preflight ===')
print(run('curl -sk -I -X OPTIONS -H "Origin: https://a.newcn.cc" -H "Access-Control-Request-Method: POST" https://a.newcn.cc/api/auth/login 2>/dev/null | grep -i "access-control\|origin"'))

# Test login flow end-to-end
print('=== Login POST test ===')
print(run('curl -sk -X POST https://a.newcn.cc/api/auth/login -H "Content-Type: application/json" -H "Origin: https://a.newcn.cc" -d \'{"email":"test@test.com","password":"test"}\' -w "\nHTTP: %{http_code}" 2>/dev/null'))

# Check web container started ok
print('=== Web container health ===')
print(run('curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/'))

# Verify containers
print('\n=== Container status ===')
result = run('docker ps --format "table {{.Names}}\t{{.Status}}" | grep vsaas')
print(result)

ssh.close()
