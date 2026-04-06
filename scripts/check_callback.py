try:
    from scripts._prod_ssh import configure_utf8_stdout, create_ssh_client
except ModuleNotFoundError:
    from _prod_ssh import configure_utf8_stdout, create_ssh_client

configure_utf8_stdout()
ssh = create_ssh_client()

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
