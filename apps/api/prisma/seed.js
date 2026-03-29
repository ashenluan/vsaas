const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('开始填充种子数据...');

  // 创建超级管理员
  const adminHash = await bcrypt.hash('admin123456', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@vsaas.com' },
    update: {},
    create: {
      email: 'admin@vsaas.com',
      passwordHash: adminHash,
      displayName: '系统管理员',
      role: 'SUPER_ADMIN',
      status: 'ACTIVE',
      creditBalance: 99999,
    },
  });
  console.log(`管理员创建成功: ${admin.email}`);

  // 创建演示用户
  const userHash = await bcrypt.hash('user123456', 12);
  const user = await prisma.user.upsert({
    where: { email: 'demo@vsaas.com' },
    update: {},
    create: {
      email: 'demo@vsaas.com',
      passwordHash: userHash,
      displayName: '演示用户',
      role: 'USER',
      status: 'ACTIVE',
      creditBalance: 100,
    },
  });
  console.log(`演示用户创建成功: ${user.email}`);

  // 创建 AI 服务商配置
  const providers = [
    { providerId: 'grok', name: 'Grok Imagine (xAI)', config: { apiBase: 'https://api.x.ai/v1' } },
    { providerId: 'sora', name: 'OpenAI Sora', config: { apiBase: 'https://api.openai.com/v1' } },
    { providerId: 'jimeng', name: '即梦 AI (字节跳动)', config: { apiBase: 'https://ark.cn-beijing.volces.com/api/v3' } },
    { providerId: 'qwen', name: '通义千问 (阿里云)', config: { apiBase: 'https://dashscope.aliyuncs.com/api/v1' } },
    { providerId: 'aliyun_wan', name: '万相数字人', config: { apiBase: 'https://dashscope.aliyuncs.com/api/v1' } },
    { providerId: 'aliyun_ims', name: '智能媒体服务 (IMS)', config: { apiBase: 'https://ice.cn-shanghai.aliyuncs.com', region: 'cn-shanghai' } },
    { providerId: 'veo', name: 'Google Veo', config: { apiBase: 'https://generativelanguage.googleapis.com' } },
  ];

  for (const p of providers) {
    await prisma.providerConfig.upsert({
      where: { providerId: p.providerId },
      update: {},
      create: p,
    });
  }
  console.log(`创建 ${providers.length} 个 AI 服务商配置`);

  // 创建模板
  const templates = [
    {
      name: '电商产品图',
      category: '电商',
      config: { defaultProvider: 'jimeng', defaultModel: 'jimeng-5.0', defaultParams: { width: 1024, height: 1024 } },
    },
    {
      name: '社交媒体短视频',
      category: '短视频',
      config: { defaultProvider: 'seedance', defaultModel: 'seedance-2.0', defaultParams: { duration: 5, resolution: '1080x1920' } },
    },
    {
      name: '数字人带货',
      category: '数字人',
      config: {
        mode: 'group',
        editingConfig: { allowTransition: true, transitionDuration: 0.5, backgroundMusicVolume: 0.2 },
        outputConfig: { width: 1080, height: 1920, count: 5 },
      },
    },
  ];

  for (const t of templates) {
    await prisma.template.create({ data: t });
  }
  console.log(`创建 ${templates.length} 个模板`);

  console.log('种子数据填充完成！');
  console.log('');
  console.log('登录信息:');
  console.log('  管理员: admin@vsaas.com / admin123456');
  console.log('  用户:   demo@vsaas.com / user123456');
}

main()
  .catch((e) => {
    console.error('种子数据填充失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
