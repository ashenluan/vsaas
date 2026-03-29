const fs = require('fs');

let content = fs.readFileSync('src/app/(auth)/login/page.tsx', 'utf8');
content = content.replace("import { Input } from '@/components/ui/input';", "import { Input } from '@/components/ui/input';\nimport { Badge } from '@/components/ui/badge';");

fs.writeFileSync('src/app/(auth)/login/page.tsx', content);
