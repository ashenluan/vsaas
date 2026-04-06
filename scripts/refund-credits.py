import sys

try:
    from scripts._prod_ssh import create_ssh_client
except ModuleNotFoundError:
    from _prod_ssh import create_ssh_client

USER_ID = 'cmncbcsdo0001s23im6krudbx'

def run(ssh, cmd, label=''):
    if label:
        print(f'\n=== {label} ===')
    print(f'$ {cmd}')
    stdin, stdout, stderr = ssh.exec_command(cmd, timeout=30)
    out = stdout.read()
    err = stderr.read()
    if out:
        sys.stdout.buffer.write(out[-4000:])
    if err:
        sys.stdout.buffer.write(err[-2000:])
    sys.stdout.flush()
    return stdout.channel.recv_exit_status()

ssh = create_ssh_client()
print('Connected')

# Check current balance
run(ssh, f'docker exec vsaas-postgres psql -U vsaas -d vsaas -c "SELECT id, email, credit_balance FROM users WHERE id = \'{USER_ID}\';"', 'Current balance')

# Refund 60 credits
run(ssh, f'docker exec vsaas-postgres psql -U vsaas -d vsaas -c "UPDATE users SET credit_balance = credit_balance + 60 WHERE id = \'{USER_ID}\';"', 'Refund 60 credits')

# Verify
run(ssh, f'docker exec vsaas-postgres psql -U vsaas -d vsaas -c "SELECT id, email, credit_balance FROM users WHERE id = \'{USER_ID}\';"', 'After refund')

ssh.close()
print('\n\nDone')
