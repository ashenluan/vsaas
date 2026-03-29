import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { ProviderRegistry } from '../provider/provider.registry';
import { UserService } from '../user/user.service';

@Injectable()
export class GenerationService {
  private readonly logger = new Logger(GenerationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly providers: ProviderRegistry,
    private readonly userService: UserService,
    @InjectQueue('image-generation') private readonly imageQueue: Queue,
    @InjectQueue('video-generation') private readonly videoQueue: Queue,
  ) {}

  async createImageGeneration(userId: string, input: {
    prompt: string;
    negativePrompt?: string;
    width: number;
    height: number;
    providerId: string;
    count: number;
    style?: string;
    seed?: number;
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
          style: input.style,
          seed: input.seed,
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
    INPAINT: 5,
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
    maskImage?: string;
    count?: number;
  }) {
    const count = input.count || 1;
    const baseCost = this.advancedCostMap[input.type] || 5;
    const totalCost = baseCost * count;

    const descriptions: Record<string, string> = {
      STYLE_COPY: '一键仿图',
      TEXT_EDIT: '无损改字',
      HANDHELD_PRODUCT: '手持产品',
      MULTI_FUSION: '多图融合',
      VIRTUAL_TRYON: '一键换装',
      INPAINT: '局部编辑',
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
  }) {
    const { type, status, page = 1, pageSize = 20 } = query;
    const where: any = { userId };
    if (type) where.type = type;
    if (status) where.status = status;

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
}
