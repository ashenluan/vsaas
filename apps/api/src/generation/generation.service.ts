import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { ProviderRegistry } from '../provider/provider.registry';
import { UserService } from '../user/user.service';

const VALID_GENERATION_JOB_TYPES = new Set([
  'TEXT_TO_IMAGE',
  'IMAGE_TO_IMAGE',
  'TEXT_TO_VIDEO',
  'IMAGE_TO_VIDEO',
  'VOICE_CLONE',
  'DIGITAL_HUMAN_VIDEO',
  'BATCH_COMPOSE',
  'STYLE_COPY',
  'TEXT_EDIT',
  'HANDHELD_PRODUCT',
  'MULTI_FUSION',
  'VIRTUAL_TRYON',
  'INPAINT',
  'IMAGE_EDIT',
  'STORYBOARD',
]);

@Injectable()
export class GenerationService {
  private readonly logger = new Logger(GenerationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly providers: ProviderRegistry,
    private readonly userService: UserService,
    @InjectQueue('image-generation') private readonly imageQueue: Queue,
    @InjectQueue('video-generation') private readonly videoQueue: Queue,
    @InjectQueue('storyboard-compose') private readonly storyboardQueue: Queue,
  ) {}

  async createImageGeneration(userId: string, input: {
    prompt: string;
    negativePrompt?: string;
    width: number;
    height: number;
    providerId: string;
    count: number;
    model?: string;
    style?: string;
    seed?: number;
    promptExtend?: boolean;
    referenceImage?: string;
  }) {
    const provider = this.providers.getImageProvider(input.providerId);
    if (!provider) throw new BadRequestException(`Unknown provider: ${input.providerId}`);

    const available = await provider.isAvailable();
    if (!available) throw new BadRequestException(`Provider ${input.providerId} is not available`);

    const estimatedCost = provider.estimateCost(input);
    // 先扣费再入队，避免竞态条件
    await this.userService.deductCredits(userId, estimatedCost, `图片生成: ${input.prompt?.slice(0, 50)}`);

    const job = await this.prisma.generation.create({
      data: {
        userId,
        type: 'TEXT_TO_IMAGE',
        status: 'PENDING',
        provider: input.providerId,
        creditsUsed: estimatedCost,
        input: {
          prompt: input.prompt,
          negativePrompt: input.negativePrompt,
          width: input.width,
          height: input.height,
          count: input.count,
          model: input.model,
          style: input.style,
          seed: input.seed,
          promptExtend: input.promptExtend,
          referenceImage: input.referenceImage,
        },
      },
    });

    this.logger.log(`Created image generation ${job.id} for user ${userId}`);

    // Dispatch to BullMQ
    await this.imageQueue.add('generate', {
      jobId: job.id,
      userId,
      input,
    });

    return job;
  }

  async createVideoGeneration(userId: string, input: {
    prompt: string;
    providerId: string;
    duration?: number;
    resolution?: string;
    referenceImage?: string;
    media?: { type: string; url: string; reference_voice?: string }[];
    ratio?: string;
    negativePrompt?: string;
    promptExtend?: boolean;
  }) {
    const provider = this.providers.getVideoProvider(input.providerId);
    if (!provider) throw new BadRequestException(`Unknown provider: ${input.providerId}`);

    const available = await provider.isAvailable();
    if (!available) throw new BadRequestException(`Provider ${input.providerId} is not available`);

    const estimatedCost = provider.estimateCost(input);
    // 先扣费再入队，避免竞态条件
    await this.userService.deductCredits(userId, estimatedCost, `视频生成: ${input.prompt?.slice(0, 50)}`);

    const job = await this.prisma.generation.create({
      data: {
        userId,
        type: 'TEXT_TO_VIDEO',
        status: 'PENDING',
        provider: input.providerId,
        creditsUsed: estimatedCost,
        input: {
          prompt: input.prompt,
          duration: input.duration,
          resolution: input.resolution,
          referenceImage: input.referenceImage,
          ...(input.media && { media: input.media }),
          ...(input.ratio && { ratio: input.ratio }),
          ...(input.negativePrompt && { negativePrompt: input.negativePrompt }),
          ...(input.promptExtend !== undefined && { promptExtend: input.promptExtend }),
        },
      },
    });

    this.logger.log(`Created video generation ${job.id} for user ${userId}`);

    // Dispatch to BullMQ
    await this.videoQueue.add('generate', {
      jobId: job.id,
      userId,
      input,
    });

    return job;
  }

  // Cost map for advanced image types (per image)
  private readonly advancedCostMap: Record<string, number> = {
    STYLE_COPY: 5,
    TEXT_EDIT: 5,
    HANDHELD_PRODUCT: 5,
    MULTI_FUSION: 10,
    VIRTUAL_TRYON: 8,
    VIRTUAL_TRYON_PLUS: 12,
    INPAINT: 5,
    IMAGE_EDIT: 5,
    IMAGE_EDIT_PRO: 10,
  };

  async createAdvancedImageGeneration(userId: string, input: {
    type: string;
    prompt?: string;
    referenceImage?: string;
    sourceImage?: string;
    textEdits?: { original: string; replacement: string }[];
    productImage?: string;
    personImage?: string;
    images?: string[];
    fusionMode?: string;
    clothingImage?: string;
    topGarmentUrl?: string;
    bottomGarmentUrl?: string;
    tryonModel?: string;
    restoreFace?: boolean;
    resolution?: number;
    maskImage?: string;
    count?: number;
  }) {
    const count = input.count || 1;
    // Model-based cost overrides
    let costKey = input.type;
    if (input.type === 'VIRTUAL_TRYON' && (input as any).tryonModel === 'aitryon-plus') {
      costKey = 'VIRTUAL_TRYON_PLUS';
    } else if (input.type === 'IMAGE_EDIT' && (input as any).editModel === 'wan2.7-image-pro') {
      costKey = 'IMAGE_EDIT_PRO';
    }
    const baseCost = this.advancedCostMap[costKey] || 5;
    const totalCost = baseCost * count;

    const descriptions: Record<string, string> = {
      STYLE_COPY: '一键仿图',
      TEXT_EDIT: '无损改字',
      HANDHELD_PRODUCT: '手持产品',
      MULTI_FUSION: '多图融合',
      VIRTUAL_TRYON: '一键换装',
      INPAINT: '局部编辑',
      IMAGE_EDIT: '图像编辑',
    };

    await this.userService.deductCredits(
      userId,
      totalCost,
      `${descriptions[input.type] || '高级图片生成'}: ${(input.prompt || '').slice(0, 50)}`,
    );

    const job = await this.prisma.generation.create({
      data: {
        userId,
        type: input.type as any,
        status: 'PENDING',
        provider: 'auto',
        creditsUsed: totalCost,
        input: input as any,
      },
    });

    this.logger.log(`Created advanced image generation ${job.id} (${input.type}) for user ${userId}`);

    await this.imageQueue.add('generate-advanced', {
      jobId: job.id,
      userId,
      input,
    });

    return job;
  }

  async findById(jobId: string, userId?: string) {
    const where: any = { id: jobId };
    if (userId) where.userId = userId;

    const job = await this.prisma.generation.findFirst({ where });
    if (!job) throw new NotFoundException('Generation job not found');
    return job;
  }

  async listByUser(userId: string, query: {
    type?: string;
    status?: string;
    page?: number;
    pageSize?: number;
    provider?: string;
  }) {
    const { type, status, page = 1, pageSize = 20, provider } = query;
    const where: any = { userId };
    // Map frontend shorthand types to valid JobType enum values
    if (type) {
      const typeMap: Record<string, string[]> = {
        'IMAGE': ['TEXT_TO_IMAGE', 'IMAGE_TO_IMAGE', 'STYLE_COPY', 'TEXT_EDIT', 'HANDHELD_PRODUCT', 'MULTI_FUSION', 'VIRTUAL_TRYON', 'INPAINT', 'IMAGE_EDIT'],
        'VIDEO': ['TEXT_TO_VIDEO', 'IMAGE_TO_VIDEO', 'STORYBOARD'],
      };
      if (typeMap[type]) {
        const validTypes = typeMap[type].filter((jobType) => VALID_GENERATION_JOB_TYPES.has(jobType));
        if (validTypes.length > 0) where.type = { in: validTypes };
      } else if (VALID_GENERATION_JOB_TYPES.has(type)) {
        where.type = type;
      } else {
        where.type = { in: [] };
      }
    }
    if (status) where.status = status;
    if (provider) where.provider = provider;

    const [items, total] = await Promise.all([
      this.prisma.generation.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.generation.count({ where }),
    ]);

    return { items, total, page, pageSize };
  }

  async updateExternalId(jobId: string, externalId: string) {
    return this.prisma.generation.update({
      where: { id: jobId },
      data: { externalId },
    });
  }

  async updateStatus(jobId: string, status: string, metadata?: any) {
    const data: any = {
      status: status as any,
    };
    if (['COMPLETED', 'FAILED'].includes(status)) data.completedAt = new Date();
    if (status === 'FAILED' && metadata?.error) data.errorMsg = metadata.error;
    // 将完整的 metadata 存入 output（Processor 传入的是扁平结果对象）
    if (status === 'COMPLETED' && metadata) data.output = metadata;

    return this.prisma.generation.update({
      where: { id: jobId },
      data,
    });
  }

  async getProviders() {
    return {
      image: this.providers.listImageProviders(),
      video: this.providers.listVideoProviders(),
    };
  }

  // ========== 一键成片 — 合成分镜视频 ==========

  async createStoryboardCompose(userId: string, input: {
    videos: { url: string; duration: number }[];
    transition?: string;
    transitionDuration?: number;
    width: number;
    height: number;
    bgMusicUrl?: string;
  }) {
    if (!input.videos || input.videos.length < 2) {
      throw new BadRequestException('至少需要 2 个分镜视频才能合成');
    }

    const creditCost = 10; // flat cost for composition
    await this.userService.deductCredits(userId, creditCost, `成片合成: ${input.videos.length} 个分镜`);

    const job = await this.prisma.generation.create({
      data: {
        userId,
        type: 'STORYBOARD',
        status: 'PENDING',
        provider: 'aliyun-ims',
        creditsUsed: creditCost,
        input: {
          videos: input.videos,
          transition: input.transition,
          transitionDuration: input.transitionDuration,
          width: input.width,
          height: input.height,
          bgMusicUrl: input.bgMusicUrl,
        },
      },
    });

    this.logger.log(`Created storyboard compose ${job.id} for user ${userId}`);

    await this.storyboardQueue.add('compose', {
      jobId: job.id,
      userId,
      ...input,
    });

    return job;
  }
