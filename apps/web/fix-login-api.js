const fs = require('fs');

let content = fs.readFileSync('src/app/(auth)/login/page.tsx', 'utf8');
content = content.replace('authApi.login({ email, password })', 'authApi.login(email, password)');
content = content.replace('authApi.register({ email, password })', 'authApi.register(email, password)');

fs.writeFileSync('src/app/(auth)/login/page.tsx', content);
