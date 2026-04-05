import paramiko, sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('47.103.96.48', username='root', password='Shibushia@521')

def run(cmd):
    _, o, e = ssh.exec_command(cmd, timeout=30)
    return o.read().decode(errors='replace') + e.read().decode(errors='replace')

# Check recent logs for this job
print('=== Job logs ===')
print(run('docker logs vsaas-api --since 600s 2>&1 | grep -i "cmnilh3lk" | tail -30'))

print('\n=== S2V + IMS logs ===')
print(run('docker logs vsaas-api --since 600s 2>&1 | grep -iE "s2v|ims|split|expanded|vfx|forbidden|subscription" | tail -30'))

# Query DB for job details including input config
print('\n=== Job input from DB ===')
sql = "SELECT LEFT(input::text, 2000) FROM generations WHERE id = 'cmnilh3lk0007qo01awmbxrab';"
print(run(f'docker exec vsaas-postgres psql -U vsaas -d vsaas -t -c "{sql}"'))

# Check error details
print('\n=== Job error ===')
sql2 = "SELECT error_msg FROM generations WHERE id = 'cmnilh3lk0007qo01awmbxrab';"
print(run(f'docker exec vsaas-postgres psql -U vsaas -d vsaas -t -c "{sql2}"'))

ssh.close()
