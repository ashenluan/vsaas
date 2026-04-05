import paramiko
import sys
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('47.103.96.48', username='root', password='Shibushia@521')

def run(cmd):
    _, o, e = ssh.exec_command(cmd)
    return o.read().decode(errors='replace')

print('=== Web container startup logs ===')
print(run('docker logs vsaas-web 2>&1 | head -50'))

print('=== Test login page ===')
print('Login:', run('curl -sk https://a.newcn.cc/login -o /dev/null -w "%{http_code} %{size_download}"'))

print('=== Direct web /login ===')
print('Direct:', run('curl -s http://localhost:3000/login -o /dev/null -w "%{http_code} %{size_download}"'))

print('=== Check Next.js build ===')
print(run('docker exec vsaas-web ls -la .next/ 2>&1 | head -10'))

print('=== Build ID ===')
build_id = run('docker exec vsaas-web cat .next/BUILD_ID 2>/dev/null').strip()
print('BUILD_ID:', build_id)

print('=== Build manifest test ===')
if build_id:
    print(run(f'curl -sk https://a.newcn.cc/_next/static/{build_id}/_buildManifest.js -o /dev/null -w "%{{http_code}} %{{size_download}}"'))

print('=== Login page HTML (first 20 lines) ===')
print(run('curl -sk https://a.newcn.cc/login 2>/dev/null | head -20'))

print('=== API /compose/options (unauthed, expect 401) ===')
print(run('curl -sk https://a.newcn.cc/api/compose/options -w "\n%{http_code}"'))

ssh.close()
