import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('47.103.96.48', username='root', password='Shibushia@521')

# Check nginx error log
print('=== Nginx error log (recent) ===')
_, o, _ = ssh.exec_command('tail -30 /www/wwwlogs/a.newcn.cc.error.log 2>/dev/null || tail -30 /var/log/nginx/error.log 2>/dev/null')
print(o.read().decode(errors='replace'))

# Check nginx access log for recent requests
print('=== Nginx access log (last 10) ===')
_, o, _ = ssh.exec_command('tail -10 /www/wwwlogs/a.newcn.cc.log 2>/dev/null || tail -10 /var/log/nginx/access.log 2>/dev/null')
print(o.read().decode(errors='replace'))

# Find nginx config for this site
print('=== Nginx site config ===')
_, o, _ = ssh.exec_command('find /www/server/panel/vhost/nginx/ -name "*newcn*" -o -name "*vsaas*" 2>/dev/null | head -5')
configs = o.read().decode().strip()
print('Config files:', configs)

if configs:
    first_conf = configs.split('\n')[0]
    print(f'\n=== Content of {first_conf} ===')
    _, o, _ = ssh.exec_command(f'cat {first_conf}')
    print(o.read().decode(errors='replace'))

# Check if web container is actually serving
print('=== Direct web request ===')
_, o, _ = ssh.exec_command('curl -s -I http://localhost:3000/ | head -15')
print(o.read().decode(errors='replace'))

# Check if API container is serving
print('=== Direct API request ===')
_, o, _ = ssh.exec_command('curl -s -I http://localhost:4000/ | head -10')
print(o.read().decode(errors='replace'))

# Check docker logs for web (last 30 lines)
print('=== Web container full logs ===')
_, o, _ = ssh.exec_command('docker logs vsaas-web --since 300s 2>&1 | tail -30')
print(o.read().decode(errors='replace'))

ssh.close()
