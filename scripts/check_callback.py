import paramiko, sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('47.103.96.48', username='root', password='Shibushia@521')

def run(cmd):
    _, o, e = ssh.exec_command(cmd, timeout=30)
    return o.read().decode(errors='replace') + e.read().decode(errors='replace')

# Check callback token in container
print('=== IMS_CALLBACK_TOKEN in container ===')
print(run('docker exec vsaas-api printenv IMS_CALLBACK_TOKEN'))

# Check callback token in .env
print('=== IMS_CALLBACK_TOKEN in .env ===')
print(run('grep IMS_CALLBACK_TOKEN /www/wwwroot/vsaas/.env'))

# Check how callback validates token
print('=== Check retry status of previous job ===')
print(run('docker logs vsaas-api --since 300s 2>&1 | grep -iE "cmnilh3lk|mixcut.*prod|ims.*job" | tail -20'))

ssh.close()
