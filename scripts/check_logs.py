try:
    from scripts._prod_ssh import create_ssh_client
except ModuleNotFoundError:
    from _prod_ssh import create_ssh_client

ssh = create_ssh_client()

_, stdout, _ = ssh.exec_command('docker logs vsaas-api --since 300s 2>&1 | tail -50')
lines = stdout.read().decode().splitlines()
keywords = ['batch', 's2v', 'split', 'expanded', 'compose', 'tts']
for line in lines:
    low = line.lower()
    if any(k in low for k in keywords):
        print(line)

if not any(any(k in l.lower() for k in keywords) for l in lines):
    print('(no compose activity yet - submit a job from /digital-human/compose to test)')

ssh.close()
