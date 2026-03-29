import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { ProviderRegistry } from '../provider/provider.registry';
import { UserService } from '../user/user.service';
import {
  TRANSITION_LIST,
  VFX_EFFECT_LIST,
  FILTER_LIST,
  SUBTITLE_STYLE_LIST,
  BUBBLE_STYLE_LIST,
} from '../provider/aliyun-ims/ims-compose.provider';

@Injectable()
export class DigitalHumanService {
  private readonly logger = new Logger(DigitalHumanService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly providers: ProviderRegistry,
    private readonly userService: UserService,
    @InjectQueue('voice-cloning') private readonly voiceQueue: Queue,
    @InjectQueue('batch-production') private readonly batchQueue: Queue,
    @InjectQueue('digital-human-video') private readonly dhVideoQueue: Queue,
  ) {}

  // ==================== Voices ====================

  async listVoices(userId: string) {
    return this.prisma.voice.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    }) as any;
  }

  async cloneVoice(userId: string, name: string, sampleUrl: string) {
    const cost = 10;
    await this.userService.deductCredits(userId, cost, `声音克隆: ${name}`);

    const voice = await this.prisma.voice.create({
      data: {
        userId,
        name,
        voiceId: '',
        sampleUrl,
        status: 'PENDING',
      },
    });

    // Dispatch to BullMQ queue for reliable processing
    await this.voiceQueue.add('clone', {
      voiceId: voice.id,
      userId,
      sampleUrl,
    }, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
    });

    this.logger.log(`Voice clone job queued: ${voice.id}`);
    return voice;
  }


  async previewVoice(userId: string, voiceId: string, text: string) {
    // 校验声音所有权
    const voice = await this.prisma.voice.findFirst({
      where: { voiceId, userId, status: 'READY' },
    });
    if (!voice) throw new NotFoundException('Voice not found or not ready');

    try {
      const voiceProvider = this.providers.voiceProvider;
      const result = await voiceProvider.synthesizeSpeech(text, voiceId);
      return { audioUrl: result.audioUrl };
    } catch (error: any) {
      throw new BadRequestException(`TTS failed: ${error.message}`);
    }
  }

  async deleteVoice(userId: string, id: string) {
    const voice = await this.prisma.voice.findFirst({
      where: { id, userId },
    });
    if (!voice) throw new NotFoundException('Voice not found');
    await this.prisma.voice.delete({ where: { id } });
    return { success: true };
  }

  // ==================== Materials ====================

  async listMaterials(userId: string, type?: string) {
    const where: any = { userId };
    if (type) where.type = type;
    return this.prisma.material.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  async createMaterial(
    userId: string,
    data: {
      name: string;
      type: string;
      url: string;
      thumbnailUrl?: string;
      size?: number;
      mimeType?: string;
    },
  ) {
    return this.prisma.material.create({
      data: {
        userId,
        name: data.name,
        type: data.type as any,
        url: data.url,
        thumbnailUrl: data.thumbnailUrl,
        size: data.size || 0,
        mimeType: data.mimeType || 'application/octet-stream',
      },
    });
  }

  async detectFace(userId: string, materialId: string, imageUrl: string) {
    // Check cache first
    if (materialId) {
      const material = await this.prisma.material.findFirst({
        where: { id: materialId, userId },
      });
      if (material?.metadata && (material.metadata as any).faceDetect) {
        this.logger.log(`Face detect cache hit for material ${materialId}`);
        return (material.metadata as any).faceDetect;
      }
    }

    try {
      const dhProvider = this.providers.digitalHumanProvider;
      const result = await dhProvider.detectImage(imageUrl);

      // Cache result on the material
      if (materialId) {
        const existing = await this.prisma.material.findUnique({ where: { id: materialId } });
        await this.prisma.material.update({
          where: { id: materialId },
          data: {
            metadata: {
              ...((existing?.metadata as any) || {}),
              faceDetect: result,
              faceDetectAt: new Date().toISOString(),
            },
          },
        });
      }

      return result;
    } catch (error: any) {
      return { valid: false, reason: error.message };
    }
  }

  async deleteMaterial(userId: string, id: string) {
    const material = await this.prisma.material.findFirst({
      where: { id, userId },
    });
    if (!material) throw new NotFoundException('Material not found');
    await this.prisma.material.delete({ where: { id } });
    return { success: true };
  }

  // ==================== Scripts ====================

  async listScripts(userId: string) {
    return this.prisma.script.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async createScript(
    userId: string,
    data: { title: string; content: string; tags?: string[] },
  ) {
    return this.prisma.script.create({
      data: {
        userId,
        title: data.title,
        content: data.content,
        tags: data.tags || [],
      },
    });
  }

  async updateScript(
    userId: string,
    id: string,
    data: { title?: string; content?: string; tags?: string[] },
  ) {
    const script = await this.prisma.script.findFirst({
      where: { id, userId },
    });
    if (!script) throw new NotFoundException('Script not found');
    return this.prisma.script.update({
      where: { id },
      data,
    });
  }

  async deleteScript(userId: string, id: string) {
    const script = await this.prisma.script.findFirst({
      where: { id, userId },
    });
    if (!script) throw new NotFoundException('Script not found');
    await this.prisma.script.delete({ where: { id } });
    return { success: true };
  }

  // ==================== Compose ====================

  async listComposeJobs(userId: string) {
    return this.prisma.generation.findMany({
      where: { userId, type: 'BATCH_COMPOSE' },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * 获取混剪可用的选项（转场、特效、滤镜、字幕模板等）
   */
  getComposeOptions() {
    return {
      transitions: [...TRANSITION_LIST],
      effects: VFX_EFFECT_LIST,
      filters: FILTER_LIST,
      subtitleStyles: SUBTITLE_STYLE_LIST,
      bubbleStyles: BUBBLE_STYLE_LIST,
    };
  }

  async createComposeJob(
    userId: string,
    data: {
      voiceId: string;
      avatarId: string;
      scriptIds: string[];
      materialIds?: string[];
      bgMusic?: string;
      videoCount: number;
      resolution: string;
      subtitleConfig?: any;
      titleConfig?: any;
      effectsConfig?: any;
      transitionConfig?: any;
      filterConfig?: any;
    },
  ) {
    // Validate voice
    const voice = await this.prisma.voice.findFirst({
      where: { voiceId: data.voiceId, userId, status: 'READY' },
    });
    if (!voice) throw new BadRequestException('Voice not found or not ready');

    // Validate avatar
    const avatar = await this.prisma.material.findFirst({
      where: { id: data.avatarId, userId },
    });
    if (!avatar) throw new BadRequestException('Avatar not found');

    // 检查形象是否通过人脸检测
    const faceDetect = (avatar.metadata as any)?.faceDetect;
    if (!faceDetect?.valid) {
      throw new BadRequestException(
        '该形象未通过人脸检测，请先在「数字人形象」页面进行人脸检测',
      );
    }

    // Validate scripts
    const scripts = await this.prisma.script.findMany({
      where: { id: { in: data.scriptIds }, userId },
    });
    if (scripts.length === 0)
      throw new BadRequestException('No valid scripts selected');

    // Fetch additional materials if provided
    let materials: any[] = [];
    if (data.materialIds?.length) {
      materials = await this.prisma.material.findMany({
        where: { id: { in: data.materialIds }, userId },
      });
    }

    // Estimate cost
    const costPerVideo = 20;
    const totalCost = costPerVideo * data.videoCount;
    await this.userService.deductCredits(
      userId,
      totalCost,
      `批量混剪: ${data.videoCount}条视频`,
    );

    const job = await this.prisma.generation.create({
      data: {
        userId,
        type: 'BATCH_COMPOSE',
        status: 'PENDING',
        provider: 'aliyun-ims',
        creditsUsed: totalCost,
        input: {
          voiceId: data.voiceId,
          avatarId: data.avatarId,
          avatarUrl: avatar.url,
          scriptIds: data.scriptIds,
          scripts: scripts.map((s) => ({ id: s.id, title: s.title, content: s.content })),
          materialIds: data.materialIds || [],
          materials: materials.map((m) => ({ id: m.id, name: m.name, type: m.type, url: m.url })),
          bgMusic: data.bgMusic,
          videoCount: data.videoCount,
          resolution: data.resolution,
          subtitleConfig: data.subtitleConfig,
          titleConfig: data.titleConfig,
          effectsConfig: data.effectsConfig,
          transitionConfig: data.transitionConfig,
          filterConfig: data.filterConfig,
        },
      },
    });

    // Dispatch to BullMQ queue for processing
    await this.batchQueue.add('compose', {
      jobId: job.id,
      userId,
      input: job.input,
    }, {
      attempts: 2,
      backoff: { type: 'exponential', delay: 10000 },
    });

    this.logger.log(
      `Compose job ${job.id} queued for user ${userId}: ${data.videoCount} videos`,
    );

    return job;
  }

  async getComposeJob(userId: string, id: string) {
    const job = await this.prisma.generation.findFirst({
      where: { id, userId, type: 'BATCH_COMPOSE' },
    });
    if (!job) throw new NotFoundException('Compose job not found');
    return job;
  }

  // ==================== Single Video Creation ====================

  async createVideo(
    userId: string,
    data: {
      avatarId: string;
      driveMode: 'text' | 'audio';
      resolution: string;
      name?: string;
      voiceId?: string;
      text?: string;
      audioUrl?: string;
    },
  ) {
    // Validate avatar
    const avatar = await this.prisma.material.findFirst({
      where: { id: data.avatarId, userId },
    });
    if (!avatar) throw new BadRequestException('数字人形象不存在');

    // Check face detection
    const faceDetect = (avatar.metadata as any)?.faceDetect;
    if (!faceDetect?.valid) {
      throw new BadRequestException(
        '该形象未通过人脸检测，请先进行人脸检测',
      );
    }

    // Validate voice for text mode
    if (data.driveMode === 'text') {
      if (!data.voiceId) throw new BadRequestException('请选择声音');
      if (!data.text?.trim()) throw new BadRequestException('请输入台词文案');

      const voice = await this.prisma.voice.findFirst({
        where: { voiceId: data.voiceId, userId, status: 'READY' },
      });
      if (!voice) throw new BadRequestException('声音不存在或未就绪');
    }

    // Validate audio for audio mode
    if (data.driveMode === 'audio' && !data.audioUrl) {
      throw new BadRequestException('请上传音频文件');
    }

    // Deduct credits
    const cost = 15;
    await this.userService.deductCredits(
      userId,
      cost,
      `数字人视频: ${data.name || '未命名'}`,
    );

    // Create generation record
    const job = await this.prisma.generation.create({
      data: {
        userId,
        type: 'DIGITAL_HUMAN',
        status: 'PENDING',
        provider: 'aliyun-wan',
        creditsUsed: cost,
        input: {
          name: data.name,
          avatarId: data.avatarId,
          avatarUrl: avatar.url,
          driveMode: data.driveMode,
          resolution: data.resolution,
          ...(data.driveMode === 'text'
            ? { voiceId: data.voiceId, text: data.text }
            : { audioUrl: data.audioUrl }),
        },
      },
    });

    // Dispatch to queue
    await this.dhVideoQueue.add(
      'create-video',
      {
        jobId: job.id,
        userId,
        input: job.input,
      },
      {
        attempts: 2,
        backoff: { type: 'exponential', delay: 10000 },
      },
    );

    this.logger.log(`Digital human video job ${job.id} queued for user ${userId}`);
    return job;
  }

  async getVideo(userId: string, id: string) {
    const job = await this.prisma.generation.findFirst({
      where: { id, userId, type: 'DIGITAL_HUMAN' },
    });
    if (!job) throw new NotFoundException('视频任务不存在');
    return job;
  }
}
