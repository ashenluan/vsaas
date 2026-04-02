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
  ADVANCED_TRANSITION_LIST,
  VFX_EFFECT_LIST,
  ADVANCED_EFFECT_LIST,
  FILTER_LIST,
  SUBTITLE_STYLE_LIST,
  BUBBLE_STYLE_LIST,
  FONT_LIST,
  IMS_VOICE_LIST,
} from '../provider/aliyun-ims/ims-compose.provider';
import { StorageService } from '../storage/storage.service';

@Injectable()
export class DigitalHumanService {
  private readonly logger = new Logger(DigitalHumanService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly providers: ProviderRegistry,
    private readonly userService: UserService,
    private readonly storage: StorageService,
    @InjectQueue('voice-cloning') private readonly voiceQueue: Queue,
    @InjectQueue('batch-production') private readonly batchQueue: Queue,
    @InjectQueue('digital-human-video') private readonly dhVideoQueue: Queue,
    @InjectQueue('mixcut-production') private readonly mixcutQueue: Queue,
  ) {}

  // ==================== Voices ====================

  async listVoices(userId: string) {
    return this.prisma.voice.findMany({
      where: { OR: [{ userId }, { isPublic: true }] },
      orderBy: [{ isPublic: 'desc' }, { createdAt: 'desc' }],
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


  async previewVoice(userId: string, voiceId: string, text: string, voiceType?: string) {
    if (voiceType !== 'builtin') {
      // 校验克隆声音所有权或公共声音
      const voice = await this.prisma.voice.findFirst({
        where: {
          voiceId,
          status: 'READY',
          OR: [{ userId }, { isPublic: true }],
        },
      });
      if (!voice) throw new NotFoundException('Voice not found or not ready');
    }

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
    const where: any = { OR: [{ userId }, { isPublic: true }] };
    if (type) {
      where.OR = where.OR.map((cond: any) => ({ ...cond, type }));
    }
    return this.prisma.material.findMany({
      where,
      orderBy: [{ isPublic: 'desc' }, { createdAt: 'desc' }],
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
      metadata?: Record<string, any>;
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
        ...(data.metadata && { metadata: data.metadata }),
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
      transitions: TRANSITION_LIST,
      advancedTransitions: ADVANCED_TRANSITION_LIST,
      effects: VFX_EFFECT_LIST,
      advancedEffects: ADVANCED_EFFECT_LIST,
      filters: FILTER_LIST,
      subtitleStyles: SUBTITLE_STYLE_LIST.map(s => s.id),
      bubbleStyles: BUBBLE_STYLE_LIST.map(s => s.id),
      fonts: FONT_LIST,
      imsVoices: IMS_VOICE_LIST,
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
      highlightWords?: { word: string; fontColor?: string; outlineColour?: string; bold?: boolean }[];
      maxDuration?: number;
      crf?: number;
      speechRate?: number;
      mediaVolume?: number;
      speechVolume?: number;
      bgMusicVolume?: number;
    },
  ) {
    // Validate voice (user-owned or public)
    const voice = await this.prisma.voice.findFirst({
      where: {
        voiceId: data.voiceId,
        status: 'READY',
        OR: [{ userId }, { isPublic: true }],
      },
    });
    if (!voice) throw new BadRequestException('Voice not found or not ready');

    // Validate avatar (user-owned or public)
    const avatar = await this.prisma.material.findFirst({
      where: {
        id: data.avatarId,
        OR: [{ userId }, { isPublic: true }],
      },
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
          highlightWords: data.highlightWords,
          maxDuration: data.maxDuration,
          crf: data.crf,
          speechRate: data.speechRate,
          mediaVolume: data.mediaVolume,
          speechVolume: data.speechVolume,
          bgMusicVolume: data.bgMusicVolume,
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

  // ==================== Mixcut (脚本化自动成片) ====================

  async listMixcutJobs(userId: string) {
    return this.prisma.generation.findMany({
      where: { userId, type: 'BATCH_COMPOSE', input: { path: ['mode'], equals: 'mixcut' } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getMixcutJob(userId: string, id: string) {
    const job = await this.prisma.generation.findFirst({
      where: { id, userId, type: 'BATCH_COMPOSE' },
    });
    if (!job) throw new NotFoundException('混剪任务不存在');
    return job;
  }

  async saveMixcutDraft(
    userId: string,
    data: { id?: string; name: string; projectData: any },
  ) {
    if (data.id) {
      // Update existing draft
      const existing = await this.prisma.generation.findFirst({
        where: { id: data.id, userId, type: 'BATCH_COMPOSE' },
      });
      if (!existing) throw new NotFoundException('混剪项目不存在');
      return this.prisma.generation.update({
        where: { id: data.id },
        data: {
          input: { mode: 'mixcut', isDraft: true, name: data.name, ...data.projectData },
        },
      });
    }
    // Create new draft
    return this.prisma.generation.create({
      data: {
        userId,
        type: 'BATCH_COMPOSE',
        status: 'PENDING',
        provider: 'aliyun-ims',
        input: { mode: 'mixcut', isDraft: true, name: data.name, ...data.projectData },
      },
    });
  }

  async deleteMixcutProject(userId: string, id: string) {
    const job = await this.prisma.generation.findFirst({
      where: { id, userId, type: 'BATCH_COMPOSE' },
    });
    if (!job) throw new NotFoundException('混剪项目不存在');
    await this.prisma.generation.delete({ where: { id } });
    return { success: true };
  }

  async createMixcutJob(
    userId: string,
    data: {
      name: string;
      shotGroups: {
        name: string;
        materialUrls: string[];
        speechTexts?: string[];
        subHeadings?: string[];
        duration?: number;
        splitMode?: string;
        keepOriginalAudio?: boolean;
        volume?: number;
      }[];
      speechMode?: 'global' | 'group';
      speechTexts?: string[];
      voiceId?: string;
      voiceType?: 'builtin' | 'cloned';
      videoCount: number;
      resolution: string;
      bgMusic?: string;
      bgMusicVolume?: number;
      mediaVolume?: number;
      speechVolume?: number;
      speechRate?: number;
      subtitleConfig?: any;
      titleConfig?: any;
      highlightWords?: { word: string; fontColor?: string; outlineColour?: string; bold?: boolean }[];
      transitionEnabled?: boolean;
      transitionDuration?: number;
      transitionList?: string[];
      filterEnabled?: boolean;
      filterList?: string[];
      vfxEffectEnabled?: boolean;
      vfxEffectProbability?: number;
      vfxFirstClipEffectList?: string[];
      vfxNotFirstClipEffectList?: string[];
      bgType?: string;
      bgColor?: string;
      bgImage?: string;
      maxDuration?: number;
      fixedDuration?: number;
      crf?: number;
      generatePreviewOnly?: boolean;
      singleShotDuration?: number;
      imageDuration?: number;
      alignmentMode?: string;
      forbiddenWords?: { word: string; soundReplaceMode?: string }[];
      scheduledAt?: string;
      dedupConfig?: {
        smartCrop?: boolean;
        smartZoom?: boolean;
        smartMirror?: boolean;
        transparentMask?: boolean;
        randomSpeed?: boolean;
      };
      coverType?: 'auto' | 'custom' | 'smart';
      coverUrl?: string;
      coverConfig?: {
        coverTitle?: string;
        coverTitleFont?: string;
        coverTitleColor?: string;
        coverTitleSize?: number;
        coverTitlePosition?: 'top' | 'center' | 'bottom';
      };
      publishPlatforms?: string[];
    },
  ) {
    // Validate: at least one shot group with materials
    if (!data.shotGroups?.length) {
      throw new BadRequestException('至少需要一个镜头组');
    }
    for (const group of data.shotGroups) {
      if (!group.materialUrls?.length) {
        throw new BadRequestException(`镜头组 "${group.name}" 没有素材`);
      }
    }

    // Validate voice if speechTexts provided
    if (data.voiceId) {
      if (data.voiceType === 'builtin') {
        // Built-in IMS voices don't need DB validation
      } else {
        const voice = await this.prisma.voice.findFirst({
          where: {
            voiceId: data.voiceId,
            status: 'READY',
            OR: [{ userId }, { isPublic: true }],
          },
        });
        if (!voice) throw new BadRequestException('声音不存在或未就绪');
      }
    }

    // Deduct credits
    const costPerVideo = 20;
    const totalCost = costPerVideo * data.videoCount;
    await this.userService.deductCredits(
      userId,
      totalCost,
      `智能混剪: ${data.name} (${data.videoCount}条视频)`,
    );

    // Build IMS configs
    const imsProvider = this.providers.batchComposeProvider;

    const inputConfig = imsProvider.buildInputConfig({
      mode: data.speechMode === 'group' ? 'group' : 'global',
      mediaGroups: data.shotGroups.map((g) => ({
        groupName: g.name,
        mediaUrls: g.materialUrls,
        ...(g.speechTexts?.length && { speechTexts: g.speechTexts }),
        ...(g.duration && { duration: g.duration }),
        ...(g.splitMode && { splitMode: g.splitMode }),
        ...(g.volume !== undefined && { volume: g.volume }),
        // 无文案镜头组自动适配时长
        ...(!g.speechTexts?.length && { durationAutoAdapt: true }),
      })),
      ...(data.speechTexts?.length && { speechTexts: data.speechTexts }),
      ...(data.titleConfig?.titles?.length && { titles: data.titleConfig.titles }),
      ...(data.bgMusic && { backgroundMusic: [data.bgMusic] }),
      ...(data.bgType === 'image' && data.bgImage && { backgroundImages: [data.bgImage] }),
    });

    const { width, height } = this.parseResolutionWH(data.resolution);

    // Build specialWordsConfig from both highlight and forbidden words
    const specialWordsConfig: { type: 'Highlight' | 'Forbidden'; wordsList: string[]; style?: any; soundReplaceMode?: string }[] = [];
    if (data.highlightWords?.length) {
      for (const hw of data.highlightWords.filter((h) => h.word)) {
        specialWordsConfig.push({
          type: 'Highlight',
          wordsList: [hw.word],
          style: {
            ...(hw.fontColor && { fontColor: hw.fontColor }),
            ...(hw.outlineColour && { outlineColour: hw.outlineColour }),
            ...(hw.bold && { bold: true }),
          },
        });
      }
    }
    if (data.forbiddenWords?.length) {
      for (const fw of data.forbiddenWords.filter((f) => f.word)) {
        specialWordsConfig.push({
          type: 'Forbidden',
          wordsList: [fw.word],
          soundReplaceMode: fw.soundReplaceMode || 'mute',
        });
      }
    }

    const editingConfig = imsProvider.buildEditingConfig({
      mediaVolume: data.mediaVolume ?? 1,
      speechVolume: data.speechVolume ?? 1,
      speechRate: data.speechRate ?? 0,
      ...(data.voiceId && data.voiceType === 'builtin' && { voice: data.voiceId }),
      ...(data.voiceId && data.voiceType !== 'builtin' && { customizedVoice: data.voiceId }),
      backgroundMusicVolume: data.bgMusicVolume ?? 0.2,
      subtitleConfig: data.subtitleConfig,
      ...(specialWordsConfig.length && { specialWordsConfig }),
      // 新增处理配置
      ...(data.singleShotDuration && { singleShotDuration: data.singleShotDuration }),
      ...(data.imageDuration && { imageDuration: data.imageDuration }),
      ...(data.alignmentMode && { alignmentMode: data.alignmentMode }),
      titleConfig: data.titleConfig?.enabled ? {
        font: data.titleConfig.font,
        fontSize: data.titleConfig.fontSize,
        fontColor: data.titleConfig.fontColor,
        alignment: data.titleConfig.alignment,
        y: data.titleConfig.y,
        effectColorStyleId: data.titleConfig.effectColorStyleId,
      } : undefined,
      allowTransition: data.transitionEnabled ?? false,
      transitionDuration: data.transitionDuration,
      transitionList: data.transitionList,
      allowFilter: data.filterEnabled ?? false,
      filterList: data.filterList,
      // VFX effects
      allowEffects: data.vfxEffectEnabled ?? false,
      ...(data.vfxEffectProbability !== undefined && { vfxEffectProbability: data.vfxEffectProbability }),
      ...(data.vfxFirstClipEffectList?.length && { vfxFirstClipEffectList: data.vfxFirstClipEffectList }),
      ...(data.vfxNotFirstClipEffectList?.length && { vfxNotFirstClipEffectList: data.vfxNotFirstClipEffectList }),
      ...(data.bgType === 'blur' && { backgroundImageType: 'Blur' }),
      ...(data.bgType === 'color' && { backgroundImageType: 'Color' }),
      // 二创去重
      ...(data.dedupConfig && {
        dedupSmartCrop: data.dedupConfig.smartCrop ?? false,
        dedupSmartZoom: data.dedupConfig.smartZoom ?? false,
        dedupSmartMirror: data.dedupConfig.smartMirror ?? false,
        dedupTransparentMask: data.dedupConfig.transparentMask ?? false,
        dedupRandomSpeed: data.dedupConfig.randomSpeed ?? false,
      }),
      // 封面
      ...(data.coverType === 'smart' && data.coverConfig && {
        coverConfig: {
          coverTitle: data.coverConfig.coverTitle,
          coverTitleFont: data.coverConfig.coverTitleFont,
          coverTitleColor: data.coverConfig.coverTitleColor,
          coverTitleSize: data.coverConfig.coverTitleSize,
          coverTitlePosition: data.coverConfig.coverTitlePosition,
        },
      }),
    });

    const outputOssKey = this.storage.generateKey('mixcut', `${Date.now()}.mp4`);
    const outputUrl = this.storage.getOssUrl(outputOssKey).replace(/\.mp4$/, '_{index}.mp4');

    const outputConfig = imsProvider.buildOutputConfig({
      outputUrl,
      count: data.videoCount,
      width: width || 1080,
      height: height || 1920,
      ...(data.maxDuration && { maxDuration: data.maxDuration }),
      ...(data.fixedDuration && { fixedDuration: data.fixedDuration }),
      ...(data.crf && { crf: data.crf }),
      ...(data.generatePreviewOnly && { generatePreviewOnly: true }),
    });

    // Compute delay for scheduled jobs
    let delay: number | undefined;
    if (data.scheduledAt) {
      const scheduledTime = new Date(data.scheduledAt).getTime();
      const now = Date.now();
      if (scheduledTime > now) {
        delay = scheduledTime - now;
      }
    }

    // Create generation record
    const job = await this.prisma.generation.create({
      data: {
        userId,
        type: 'BATCH_COMPOSE',
        status: delay ? 'PENDING' : 'PENDING',
        provider: 'aliyun-ims',
        creditsUsed: totalCost,
        input: {
          mode: 'mixcut',
          name: data.name,
          shotGroups: data.shotGroups,
          speechMode: data.speechMode,
          speechTexts: data.speechTexts,
          voiceId: data.voiceId,
          videoCount: data.videoCount,
          resolution: data.resolution,
          bgMusic: data.bgMusic,
          subtitleConfig: data.subtitleConfig,
          titleConfig: data.titleConfig,
          highlightWords: data.highlightWords,
          ...(data.scheduledAt && { scheduledAt: data.scheduledAt }),
          ...(data.publishPlatforms?.length && { publishPlatforms: data.publishPlatforms }),
          ...(data.coverType && { coverType: data.coverType, coverUrl: data.coverUrl, coverConfig: data.coverConfig }),
          ...(data.dedupConfig && { dedupConfig: data.dedupConfig }),
        },
      },
    });

    // Dispatch to mixcut queue — goes directly to IMS (no TTS/S2V)
    // If scheduled, use BullMQ delay to defer processing
    await this.mixcutQueue.add('mixcut', {
      jobId: job.id,
      userId,
      inputConfig,
      editingConfig,
      outputConfig,
      videoCount: data.videoCount,
    }, {
      attempts: 2,
      backoff: { type: 'exponential', delay: 10000 },
      ...(delay && { delay }),
    });

    this.logger.log(`Mixcut job ${job.id} queued: ${data.videoCount} videos, ${data.shotGroups.length} shot groups`);
    return job;
  }

  private parseResolutionWH(resolution: string): { width: number; height: number } {
    const parts = resolution.split('x').map(Number);
    if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
      return { width: parts[0], height: parts[1] };
    }
    if (resolution.toUpperCase().includes('1080')) return { width: 1080, height: 1920 };
    return { width: 720, height: 1280 };
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
      speechRate?: number;
      audioUrl?: string;
    },
  ) {
    // Validate avatar (user-owned or public)
    const avatar = await this.prisma.material.findFirst({
      where: {
        id: data.avatarId,
        OR: [{ userId }, { isPublic: true }],
      },
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
        where: {
          voiceId: data.voiceId,
          status: 'READY',
          OR: [{ userId }, { isPublic: true }],
        },
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
        type: 'DIGITAL_HUMAN_VIDEO',
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
            ? { voiceId: data.voiceId, text: data.text, speechRate: data.speechRate || 1.0 }
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
      where: { id, userId, type: 'DIGITAL_HUMAN_VIDEO' },
    });
    if (!job) throw new NotFoundException('视频任务不存在');
    return job;
  }
}
