import { PrismaClient } from '@prisma/client';
import * as bcryptModule from 'bcryptjs';

const bcrypt = bcryptModule as any;
const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create admin user
  const adminPasswordHash = await bcrypt.hash('admin123456', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@vsaas.com' },
    update: {},
    create: {
      email: 'admin@vsaas.com',
      passwordHash: adminPasswordHash,
      displayName: '系统管理员',
      role: 'SUPER_ADMIN',
      status: 'ACTIVE',
      creditBalance: 99999,
    },
  });
  console.log(`Admin user created: ${admin.email}`);

  // Create demo user
  const userPasswordHash = await bcrypt.hash('user123456', 12);
  const user = await prisma.user.upsert({
    where: { email: 'demo@vsaas.com' },
    update: {},
    create: {
      email: 'demo@vsaas.com',
      passwordHash: userPasswordHash,
      displayName: '演示用户',
      role: 'USER',
      status: 'ACTIVE',
      creditBalance: 100,
    },
  });
  console.log(`Demo user created: ${user.email}`);

  // Create credit packages
  const packages = [
    { name: '体验包', credits: 50, price: 9.9, currency: 'CNY', sortOrder: 1 },
    { name: '基础包', credits: 200, price: 29.9, currency: 'CNY', sortOrder: 2 },
    { name: '专业包', credits: 1000, price: 99.9, currency: 'CNY', sortOrder: 3 },
    { name: '企业包', credits: 5000, price: 399.9, currency: 'CNY', sortOrder: 4 },
  ];

  for (const pkg of packages) {
    await prisma.creditPackage.create({ data: pkg });
  }
  console.log(`Created ${packages.length} credit packages`);

  // Create provider configs (placeholder API keys)
  const providers = [
    { name: 'Grok Imagine', provider: 'grok', apiKey: 'placeholder', apiEndpoint: 'https://api.x.ai/v1' },
    { name: 'OpenAI Sora', provider: 'sora', apiKey: 'placeholder', apiEndpoint: 'https://api.openai.com/v1' },
    { name: '即梦 Jimeng', provider: 'jimeng', apiKey: 'placeholder', apiEndpoint: 'https://ark.cn-beijing.volces.com/api/v3' },
    { name: '通义万相 Qwen', provider: 'qwen', apiKey: 'placeholder', apiEndpoint: 'https://dashscope.aliyuncs.com/api/v1' },
    { name: '阿里云 wan2.2-s2v', provider: 'aliyun_wan', apiKey: 'placeholder', apiEndpoint: 'https://dashscope.aliyuncs.com/api/v1' },
    { name: '阿里云 IMS', provider: 'aliyun_ims', apiKey: 'placeholder', apiEndpoint: 'https://ice.cn-shanghai.aliyuncs.com' },
    { name: 'Google Veo', provider: 'veo', apiKey: 'placeholder', apiEndpoint: 'https://generativelanguage.googleapis.com' },
  ];

  for (const p of providers) {
    await prisma.providerConfig.upsert({
      where: { provider: p.provider },
      update: {},
      create: p,
    });
  }
  console.log(`Created ${providers.length} provider configs`);

  // Create model configs
  const models = [
    { provider: 'grok', modelId: 'grok-aurora', displayName: 'Grok Aurora', type: 'TEXT_TO_IMAGE' as const, creditCost: 2, costUnit: 'per_image', sortOrder: 1 },
    { provider: 'jimeng', modelId: 'jimeng-5.0', displayName: '即梦 5.0', type: 'TEXT_TO_IMAGE' as const, creditCost: 2, costUnit: 'per_image', sortOrder: 2 },
    { provider: 'jimeng', modelId: 'jimeng-4.6', displayName: '即梦 4.6', type: 'TEXT_TO_IMAGE' as const, creditCost: 1, costUnit: 'per_image', sortOrder: 3 },
    { provider: 'qwen', modelId: 'qwen-wanxiang', displayName: '通义万相', type: 'TEXT_TO_IMAGE' as const, creditCost: 1, costUnit: 'per_image', sortOrder: 4 },
    { provider: 'grok', modelId: 'grok-aurora-video', displayName: 'Grok Aurora 视频', type: 'TEXT_TO_VIDEO' as const, creditCost: 5, costUnit: 'per_second', sortOrder: 1 },
    { provider: 'sora', modelId: 'sora-2', displayName: 'Sora 2', type: 'TEXT_TO_VIDEO' as const, creditCost: 8, costUnit: 'per_second', sortOrder: 2 },
    { provider: 'sora', modelId: 'sora-2-pro', displayName: 'Sora 2 Pro', type: 'TEXT_TO_VIDEO' as const, creditCost: 15, costUnit: 'per_second', sortOrder: 3 },
    { provider: 'jimeng', modelId: 'seedance-2.0', displayName: 'Seedance 2.0', type: 'TEXT_TO_VIDEO' as const, creditCost: 5, costUnit: 'per_second', sortOrder: 4 },
    { provider: 'veo', modelId: 'veo-3.1', displayName: 'Google Veo 3.1', type: 'TEXT_TO_VIDEO' as const, creditCost: 10, costUnit: 'per_second', sortOrder: 5 },
    { provider: 'aliyun_wan', modelId: 'wan2.2-s2v', displayName: '万相数字人', type: 'DIGITAL_HUMAN_VIDEO' as const, creditCost: 1, costUnit: 'per_second', sortOrder: 1 },
  ];

  for (const m of models) {
    await prisma.modelConfig.upsert({
      where: { provider_modelId: { provider: m.provider, modelId: m.modelId } },
      update: {},
      create: m,
    });
  }
  console.log(`Created ${models.length} model configs`);

  // Create sample templates
  const templates = [
    {
      name: '电商产品图',
      description: '适合电商平台的产品展示图生成',
      category: '电商',
      type: 'TEXT_TO_IMAGE' as const,
      config: { defaultModel: 'jimeng-5.0', defaultParams: { width: 1024, height: 1024 }, promptPrefix: '高质量产品展示图，白色背景，' },
      sortOrder: 1,
    },
    {
      name: '社交媒体短视频',
      description: '适合抖音、快手等短视频平台',
      category: '短视频',
      type: 'TEXT_TO_VIDEO' as const,
      config: { defaultModel: 'seedance-2.0', defaultParams: { duration: 5, resolution: '1080x1920' } },
      sortOrder: 2,
    },
    {
      name: '数字人带货',
      description: '数字人口播带货视频模板',
      category: '数字人',
      type: 'BATCH_COMPOSE' as const,
      config: {
        mode: 'group',
        editingConfig: { allowTransition: true, transitionDuration: 0.5, backgroundMusicVolume: 0.2 },
        outputConfig: { width: 1080, height: 1920, count: 5 },
      },
      sortOrder: 3,
    },
  ];

  for (const t of templates) {
    await prisma.template.create({ data: t });
  }
  console.log(`Created ${templates.length} templates`);

  // Create public preset voices
  const presetVoices = [
    { name: '甜美女声', voiceId: 'longxiaochun', status: 'READY' as const, provider: 'qwen', isPublic: true, language: 'zh-CN', gender: 'female', tags: JSON.stringify(['甜美', '年轻', '活力']) },
    { name: '成熟男声', voiceId: 'longshuo', status: 'READY' as const, provider: 'qwen', isPublic: true, language: 'zh-CN', gender: 'male', tags: JSON.stringify(['成熟', '稳重', '磁性']) },
    { name: '知性女声', voiceId: 'longyue', status: 'READY' as const, provider: 'qwen', isPublic: true, language: 'zh-CN', gender: 'female', tags: JSON.stringify(['知性', '温柔', '专业']) },
    { name: '活力男声', voiceId: 'longjielidou', status: 'READY' as const, provider: 'qwen', isPublic: true, language: 'zh-CN', gender: 'male', tags: JSON.stringify(['活力', '阳光', '年轻']) },
    { name: '温柔女声', voiceId: 'longshu', status: 'READY' as const, provider: 'qwen', isPublic: true, language: 'zh-CN', gender: 'female', tags: JSON.stringify(['温柔', '亲和', '自然']) },
    { name: '播音男声', voiceId: 'longcheng', status: 'READY' as const, provider: 'qwen', isPublic: true, language: 'zh-CN', gender: 'male', tags: JSON.stringify(['播音', '标准', '正式']) },
  ];

  for (const v of presetVoices) {
    await prisma.voice.create({
      data: {
        userId: admin.id,
        ...v,
      },
    });
  }
  console.log(`Created ${presetVoices.length} public preset voices`);

  // Create public preset avatar materials
  const presetAvatars = [
    {
      name: '商务女性',
      type: 'IMAGE' as const,
      url: 'https://img.alicdn.com/imgextra/i1/O1CN01example1.jpg',
      isPublic: true,
      category: 'business',
      mimeType: 'image/jpeg',
      metadata: { faceDetect: { valid: true, faceCount: 1 }, isPreset: true },
    },
    {
      name: '商务男性',
      type: 'IMAGE' as const,
      url: 'https://img.alicdn.com/imgextra/i2/O1CN01example2.jpg',
      isPublic: true,
      category: 'business',
      mimeType: 'image/jpeg',
      metadata: { faceDetect: { valid: true, faceCount: 1 }, isPreset: true },
    },
    {
      name: '休闲女生',
      type: 'IMAGE' as const,
      url: 'https://img.alicdn.com/imgextra/i3/O1CN01example3.jpg',
      isPublic: true,
      category: 'casual',
      mimeType: 'image/jpeg',
      metadata: { faceDetect: { valid: true, faceCount: 1 }, isPreset: true },
    },
    {
      name: '休闲男生',
      type: 'IMAGE' as const,
      url: 'https://img.alicdn.com/imgextra/i4/O1CN01example4.jpg',
      isPublic: true,
      category: 'casual',
      mimeType: 'image/jpeg',
      metadata: { faceDetect: { valid: true, faceCount: 1 }, isPreset: true },
    },
  ];

  for (const a of presetAvatars) {
    await prisma.material.create({
      data: {
        userId: admin.id,
        name: a.name,
        type: a.type,
        url: a.url,
        isPublic: a.isPublic,
        category: a.category,
        mimeType: a.mimeType,
        metadata: a.metadata,
      },
    });
  }
  console.log(`Created ${presetAvatars.length} public preset avatars`);

  console.log('Seeding complete!');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
