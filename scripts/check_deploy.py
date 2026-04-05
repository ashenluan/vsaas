import paramiko
import sys

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('47.103.96.48', username='root', password='Shibushia@521')

# Check web container status
_, o, _ = ssh.exec_command('docker ps | grep web')
print('Web container:', o.read().decode().strip() or 'NOT RUNNING')

# Check if build is still running
_, o, _ = ssh.exec_command('docker ps | grep -i build')
build = o.read().decode().strip()
if build:
    print('Build in progress:', build)

# Clear nginx cache
_, o, _ = ssh.exec_command('rm -rf /www/server/nginx/proxy_cache_dir/*')
print('Nginx cache cleared')

# Check recent web logs
_, o, _ = ssh.exec_command('docker logs vsaas-web --since 120s 2>&1 | tail -10')
print('\nRecent web logs:')
print(o.read().decode())

ssh.close()
