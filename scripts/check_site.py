import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('47.103.96.48', username='root', password='Shibushia@521')

# Read a.newcn.cc nginx config
print('=== a.newcn.cc nginx config ===')
_, o, _ = ssh.exec_command('cat /www/server/panel/vhost/nginx/a.newcn.cc.conf')
print(o.read().decode(errors='replace'))

# Check SSL cert status
print('=== SSL cert check ===')
_, o, e = ssh.exec_command('echo | openssl s_client -connect a.newcn.cc:443 -servername a.newcn.cc 2>/dev/null | openssl x509 -noout -dates 2>/dev/null')
result = o.read().decode(errors='replace').strip()
print(result or 'Could not check cert')
err = e.read().decode(errors='replace').strip()
if err: print('ERR:', err)

# Check nginx access log for a.newcn.cc (recent)
print('\n=== a.newcn.cc access log (last 10) ===')
_, o, _ = ssh.exec_command('tail -10 /www/wwwlogs/a.newcn.cc.log 2>/dev/null')
print(o.read().decode(errors='replace') or '(empty)')

print('\n=== a.newcn.cc SSL access log (last 10) ===')
_, o, _ = ssh.exec_command('tail -10 /www/wwwlogs/a.newcn.cc_ssl.log 2>/dev/null')
print(o.read().decode(errors='replace') or '(empty)')

print('\n=== a.newcn.cc error log (last 10) ===')
_, o, _ = ssh.exec_command('tail -10 /www/wwwlogs/a.newcn.cc.error.log 2>/dev/null; tail -10 /www/wwwlogs/a.newcn.cc_ssl.error.log 2>/dev/null')
print(o.read().decode(errors='replace') or '(empty)')

# Test external access
print('\n=== External access test ===')
_, o, _ = ssh.exec_command('curl -sk -o /dev/null -w "%{http_code} %{redirect_url}" https://a.newcn.cc/ 2>/dev/null')
print('HTTPS:', o.read().decode(errors='replace'))
_, o, _ = ssh.exec_command('curl -s -o /dev/null -w "%{http_code} %{redirect_url}" http://a.newcn.cc/ 2>/dev/null')
print('HTTP:', o.read().decode(errors='replace'))

ssh.close()
