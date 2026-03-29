const fs = require('fs');

let content = fs.readFileSync('src/app/(dashboard)/settings/page.tsx', 'utf8');
content = content.replace("import { UserCircle, Mail, Key, Shield, LogOut, Save, Sparkles, Phone, CreditCard, ChevronRight } from 'lucide-react';", "import { UserCircle, Mail, Key, Shield, LogOut, Save, Sparkles, Phone, CreditCard, ChevronRight, Settings } from 'lucide-react';");

fs.writeFileSync('src/app/(dashboard)/settings/page.tsx', content);
