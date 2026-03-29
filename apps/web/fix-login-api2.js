const fs = require('fs');

let content = fs.readFileSync('src/app/(auth)/login/page.tsx', 'utf8');
content = content.replace('authApi.register(email, password)', "authApi.register(email, password, email.split('@')[0])");

fs.writeFileSync('src/app/(auth)/login/page.tsx', content);
