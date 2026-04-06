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
import { StorageService } from '../storage/storage.service';
import { CREDIT_COSTS } from '../common/credit-costs';
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

const MIXCUT_SUPPORTED_SPEECH_LANGUAGES = new Set(['zh', 'en']);
const MIXCUT_SSML_ALLOWED_TAGS = new Set([
  'speak',
  'break',
  's',
  'sub',
  'w',
  'phoneme',
  'say-as',
]);
const MIXCUT_COSYVOICE_SSML_ALLOWED_TAGS = new Set([
  'speak',
  'break',
  's',
  'sub',
]);
const MIXCUT_COSYVOICE_VOICE_IDS = new Set(
  [...(IMS_VOICE_LIST['CosyVoice v1'] || []), ...(IMS_VOICE_LIST['CosyVoice v2'] || [])]
    .map((voice) => voice.id),
);

@Injectable()
export class DigitalHumanService {
  private readonly logger = new Logger(DigitalHumanService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly providers: ProviderRegistry,
    private readonly userService: UserService,
    private readonly storage: StorageService,
    @InjectQueue('voice-cloning') private readonly voiceQueue: Queue,
    @InjectQueue('digital-human-video') private readonly dhVideoQueue: Queue,
    @InjectQueue('mixcut-production') private readonly mixcutQueue: Queue,
    @InjectQueue('dh-batch-v2') private readonly dhBatchV2Queue: Queue,
  ) {}

  // ==================== Voices ====================

  async listVoices(userId: string) {
    return this.prisma.voice.findMany({
      where: { OR: [{ userId }, { isPublic: true }] },
      orderBy: [{ isPublic: 'desc' }, { createdAt: 'desc' }],
    }) as any;
  }

  async cloneVoice(userId: string, name: string, sampleUrl: string) {
    const cost = CREDIT_COSTS.VOICE_CLONE;
    await this.userService.deductCredits(userId, cost, `声音克隆: ${name}`);

    let voice: any;
    try {
      voice = await this.prisma.voice.create({
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
        creditCost: cost,
      }, {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
      });
    } catch (error) {
      this.logger.error(`Voice clone failed to enqueue, refunding ${cost} credits`);
      await this.userService.addCredits(userId, cost, 'REFUND', '退款: 声音克隆入队失败');
      if (voice) {
        await this.prisma.voice.update({ where: { id: voice.id }, data: { status: 'FAILED', metadata: { error: '入队失败' } } }).catch(() => {});
      }
      throw error;
    }

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

  // ==================== IMS Options (used by mixcut) ====================

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
        materials?: { url: string; trimIn?: number; trimOut?: number }[];
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
      speechLanguage?: 'zh' | 'en';
      videoCount: number;
      resolution: string;
      bgMusic?: string;
      bgMusicList?: string[];
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
      useUniformTransition?: boolean;
      filterEnabled?: boolean;
      filterList?: string[];
      vfxEffectEnabled?: boolean;
      vfxEffectProbability?: number;
      vfxFirstClipEffectList?: string[];
      vfxNotFirstClipEffectList?: string[];
      bgType?: string;
      bgColor?: string;
      bgImage?: string;
      bgImageList?: string[];
      bgBlurRadius?: number;
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
      watermarkText?: string;
      watermarkPosition?: string;
      watermarkOpacity?: number;
      stickers?: { url: string; x: number; y: number; width: number; height: number; opacity?: number; dyncFrames?: number }[];
    },
  ) {
    const resolvedSpeechMode = this.resolveMixcutSpeechMode(data);

    // Validate: at least one shot group with materials
    if (!data.shotGroups?.length) {
      throw new BadRequestException('至少需要一个镜头组');
    }
    for (const group of data.shotGroups) {
      const materials = this.resolveMixcutShotMaterials(group);
      if (!materials.length) {
        throw new BadRequestException(`镜头组 "${group.name}" 没有素材`);
      }
    }
    this.validateMixcutRequest(data, resolvedSpeechMode);

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

    // Build IMS configs
    const imsProvider = this.providers.batchComposeProvider;

    const backgroundMusic = this.resolveMixcutPool(data.bgMusicList, data.bgMusic);
    const backgroundImages = this.resolveMixcutPool(data.bgImageList, data.bgImage);

    const inputConfig = imsProvider.buildInputConfig({
      mode: resolvedSpeechMode,
      mediaGroups: data.shotGroups.map((g) => ({
        groupName: g.name,
        mediaUrls: this.resolveMixcutShotMaterials(g).map((material) => material.url),
        ...(g.speechTexts?.length && { speechTexts: g.speechTexts }),
        ...(g.duration && { duration: g.duration }),
        ...(g.splitMode && { splitMode: g.splitMode }),
        ...(g.volume !== undefined && { volume: g.volume }),
        // 无文案镜头组自动适配时长
        ...(!g.speechTexts?.length && { durationAutoAdapt: true }),
      })),
      ...(data.speechTexts?.length && { speechTexts: data.speechTexts }),
      ...(data.titleConfig?.titles?.length && { titles: data.titleConfig.titles }),
      ...(backgroundMusic.length && { backgroundMusic }),
      ...(data.bgType === 'image' && backgroundImages.length && { backgroundImages }),
      ...(data.stickers?.length && { stickers: data.stickers }),
      ...(() => {
        const subHeadings = data.shotGroups
          .map((g, i) => g.subHeadings?.length ? { level: i + 1, titles: g.subHeadings } : null)
          .filter((x): x is { level: number; titles: string[] } => x !== null);
        return subHeadings.length ? { subHeadings } : {};
      })(),
    });

    const { width, height } = this.parseResolutionWH(data.resolution);

    // Build specialWordsConfig from both highlight and forbidden words
    // IMS SpecialWordsConfig uses BGR color format (BBGGRR without #)
    const rgbToBgr = (hex: string) => {
      const h = hex.replace('#', '');
      return h.length === 6 ? h.slice(4, 6) + h.slice(2, 4) + h.slice(0, 2) : h;
    };

    const specialWordsConfig: { type: 'Highlight' | 'Forbidden'; wordsList: string[]; style?: any; soundReplaceMode?: string }[] = [];
    if (data.highlightWords?.length) {
      for (const hw of data.highlightWords.filter((h) => h.word)) {
        specialWordsConfig.push({
          type: 'Highlight',
          wordsList: [hw.word],
          style: {
            ...(hw.fontColor && { fontColor: rgbToBgr(hw.fontColor) }),
            ...(hw.outlineColour && { outlineColour: rgbToBgr(hw.outlineColour) }),
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
          soundReplaceMode: fw.soundReplaceMode === 'beep' ? 'Beep' : 'None',
        });
      }
    }

    const editingConfig = imsProvider.buildEditingConfig({
      mediaVolume: data.mediaVolume ?? 1,
      speechVolume: data.speechVolume ?? 1,
      speechRate: (() => {
        const rate = data.speechRate;
        if (!rate || rate === 1) return 0;
        // IMS SpeechRate: -500~500, formula from docs
        const imsRate = rate > 1
          ? Math.round((1 - 1 / rate) / 0.001)
          : Math.round((1 - 1 / rate) / 0.002);
        return Math.max(-500, Math.min(500, imsRate));
      })(),
      ...(data.voiceId && data.voiceType === 'builtin' && { voice: data.voiceId }),
      ...(data.voiceId && data.voiceType !== 'builtin' && { customizedVoice: data.voiceId }),
      ...(data.speechLanguage && { speechLanguage: data.speechLanguage }),
      backgroundMusicVolume: data.bgMusicVolume ?? 0.2,
      mediaMetaData: data.shotGroups.flatMap((group) =>
        this.resolveMixcutShotMaterials(group)
          .filter((material) => material.trimIn !== undefined || material.trimOut !== undefined)
          .map((material) => ({
            groupName: group.name,
            mediaUrl: material.url,
            trimIn: material.trimIn,
            trimOut: material.trimOut,
          })),
      ),
      subtitleConfig: data.subtitleConfig,
      ...(specialWordsConfig.length && { specialWordsConfig }),
      // 新增处理配置
      ...(data.singleShotDuration && { singleShotDuration: data.singleShotDuration, enableClipSplit: true }),
      ...(data.imageDuration && { imageDuration: data.imageDuration }),
      ...(data.alignmentMode && { alignmentMode: data.alignmentMode }),
      titleConfig: data.titleConfig?.enabled ? {
        font: data.titleConfig.font,
        fontSize: data.titleConfig.fontSize,
        fontColor: data.titleConfig.fontColor,
        alignment: data.titleConfig.alignment,
        y: data.titleConfig.y,
        adaptMode: 'AutoWrap',
        effectColorStyleId: data.titleConfig.effectColorStyleId,
      } : undefined,
      allowTransition: data.transitionEnabled ?? false,
      transitionDuration: data.transitionDuration,
      transitionList: data.transitionList,
      ...(data.useUniformTransition !== undefined && { useUniformTransition: data.useUniformTransition }),
      allowFilter: data.filterEnabled ?? false,
      filterList: data.filterList,
      // VFX effects
      allowEffects: data.vfxEffectEnabled ?? false,
      ...(data.vfxEffectProbability !== undefined && { vfxEffectProbability: data.vfxEffectProbability / 100 }),
      ...(data.vfxFirstClipEffectList?.length && { vfxFirstClipEffectList: data.vfxFirstClipEffectList }),
      ...(data.vfxNotFirstClipEffectList?.length && { vfxNotFirstClipEffectList: data.vfxNotFirstClipEffectList }),
      ...(data.bgType === 'blur' && { backgroundImageType: 'Blur', ...(data.bgBlurRadius && { backgroundImageRadius: data.bgBlurRadius }) }),
      ...(data.bgType === 'color' && { backgroundImageType: 'Color', backgroundImageColor: data.bgColor }),
      // 二创去重
      ...(data.dedupConfig && {
        dedupSmartCrop: data.dedupConfig.smartCrop ?? false,
        dedupSmartZoom: data.dedupConfig.smartZoom ?? false,
        dedupSmartMirror: data.dedupConfig.smartMirror ?? false,
        dedupTransparentMask: data.dedupConfig.transparentMask ?? false,
        dedupRandomSpeed: data.dedupConfig.randomSpeed ?? false,
      }),
      // 副标题样式
      ...(() => {
        const groups = data.shotGroups.filter((g) => g.subHeadings?.length);
        if (!groups.length) return {};
        const subHeadingConfig: Record<string, { y?: number; fontSize?: number }> = {};
        groups.forEach((g, i) => {
          const level = String(i + 1);
          subHeadingConfig[level] = { y: 0.2 + i * 0.1, fontSize: 36 };
        });
        return { subHeadingConfig };
      })(),
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

    // Deduct credits after all local validation/build steps succeed.
    const costPerVideo = CREDIT_COSTS.MIXCUT_PER_VIDEO;
    const totalCost = costPerVideo * data.videoCount;
    await this.userService.deductCredits(
      userId,
      totalCost,
      `智能混剪: ${data.name} (${data.videoCount}条视频)`,
    );

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
    let job: any;
    try {
      job = await this.prisma.generation.create({
        data: {
          userId,
          type: 'BATCH_COMPOSE',
          status: 'PENDING',
          provider: 'aliyun-ims',
          creditsUsed: totalCost,
          input: {
            mode: 'mixcut',
            name: data.name,
            shotGroups: data.shotGroups,
            speechMode: data.speechMode,
            speechTexts: data.speechTexts,
            voiceId: data.voiceId,
            voiceType: data.voiceType,
            speechLanguage: data.speechLanguage,
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
            ...(data.watermarkText && {
              watermarkText: data.watermarkText,
              watermarkPosition: data.watermarkPosition,
              watermarkOpacity: data.watermarkOpacity,
            }),
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
    } catch (error) {
      this.logger.error(`Mixcut job failed to enqueue, refunding ${totalCost} credits`);
      await this.userService.addCredits(userId, totalCost, 'REFUND', '退款: 混剪任务入队失败');
      if (job) {
        await this.prisma.generation.update({ where: { id: job.id }, data: { status: 'FAILED', errorMsg: '任务入队失败' } }).catch(() => {});
      }
      throw error;
    }

    this.logger.log(`Mixcut job ${job.id} queued: ${data.videoCount} videos, ${data.shotGroups.length} shot groups`);
    return job;
  }

  private resolveMixcutSpeechMode(data: {
    speechMode?: 'global' | 'group';
    speechTexts?: string[];
    shotGroups: { speechTexts?: string[]; duration?: number }[];
  }): 'global' | 'group' {
    if (data.speechMode) return data.speechMode;

    const hasGlobalSpeech = !!data.speechTexts?.length;
    const hasGroupSpeech = data.shotGroups.some((group) => !!group.speechTexts?.length);
    const hasGroupDuration = data.shotGroups.some((group) => group.duration !== undefined);

    if (hasGlobalSpeech) return 'global';
    if (hasGroupSpeech || hasGroupDuration) return 'group';
    return 'global';
  }

  private validateMixcutRequest(
    data: {
      speechTexts?: string[];
      shotGroups: {
        name: string;
        materialUrls: string[];
        materials?: { url: string; trimIn?: number; trimOut?: number }[];
        speechTexts?: string[];
        duration?: number;
      }[];
      videoCount: number;
      maxDuration?: number;
      fixedDuration?: number;
      alignmentMode?: string;
      voiceId?: string;
      voiceType?: 'builtin' | 'cloned';
      speechLanguage?: 'zh' | 'en';
    },
    resolvedSpeechMode: 'global' | 'group',
  ) {
    const hasGlobalSpeech = !!data.speechTexts?.length;
    const hasGroupSpeech = data.shotGroups.some((group) => !!group.speechTexts?.length);

    if (data.videoCount > 100) {
      throw new BadRequestException('阿里云脚本化自动成片单次最多生成 100 条视频');
    }

    if (data.maxDuration && data.fixedDuration) {
      throw new BadRequestException('maxDuration 和 fixedDuration 不能同时设置');
    }

    if (data.speechLanguage && !MIXCUT_SUPPORTED_SPEECH_LANGUAGES.has(data.speechLanguage)) {
      throw new BadRequestException('脚本化自动成片当前仅支持 zh 和 en 两种口播语种');
    }

    for (const group of data.shotGroups) {
      for (const material of this.resolveMixcutShotMaterials(group)) {
        const hasTrimIn = material.trimIn !== undefined;
        const hasTrimOut = material.trimOut !== undefined;

        if (hasTrimIn !== hasTrimOut) {
          throw new BadRequestException(`镜头组 "${group.name}" 的素材裁剪需要同时设置开始和结束时间`);
        }

        if (hasTrimIn && hasTrimOut && material.trimOut! <= material.trimIn!) {
          throw new BadRequestException(`镜头组 "${group.name}" 的素材裁剪结束时间必须大于开始时间`);
        }
      }

      this.validateMixcutSpeechMarkup(
        group.speechTexts,
        {
          context: `镜头组 "${group.name}" 的口播文案`,
          voiceId: data.voiceId,
          voiceType: data.voiceType,
        },
      );
    }

    if (resolvedSpeechMode === 'group') {
      if (hasGlobalSpeech) {
        throw new BadRequestException('分组口播模式下不能同时传入全局口播文案');
      }
      if (data.fixedDuration) {
        throw new BadRequestException('分组口播模式不支持 fixedDuration');
      }
      if (data.alignmentMode) {
        throw new BadRequestException('AlignmentMode 仅支持全局口播模式');
      }
      if (data.maxDuration) {
        throw new BadRequestException('分组口播模式不应设置 maxDuration');
      }
      return;
    }

    if (hasGroupSpeech) {
      throw new BadRequestException('全局口播模式下不能传入分组口播文案');
    }

    if (hasGlobalSpeech && data.fixedDuration) {
      throw new BadRequestException('存在全局口播文案时不支持 fixedDuration');
    }

    this.validateMixcutSpeechMarkup(
      data.speechTexts,
      {
        context: '全局口播文案',
        voiceId: data.voiceId,
        voiceType: data.voiceType,
      },
    );
  }

  private resolveMixcutShotMaterials(group: {
    materialUrls?: string[];
    materials?: { url: string; trimIn?: number; trimOut?: number }[];
  }): { url: string; trimIn?: number; trimOut?: number }[] {
    if (group.materials?.length) {
      return group.materials
        .filter((material) => typeof material.url === 'string' && material.url.trim().length > 0)
        .map((material) => ({
          url: material.url,
          trimIn: material.trimIn,
          trimOut: material.trimOut,
        }));
    }

    return (group.materialUrls || []).map((url) => ({ url }));
  }

  private parseResolutionWH(resolution: string): { width: number; height: number } {
    const parts = resolution.split('x').map(Number);
    if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
      return { width: parts[0], height: parts[1] };
    }
    if (resolution.toUpperCase().includes('1080')) return { width: 1080, height: 1920 };
    return { width: 720, height: 1280 };
  }

  private resolveMixcutPool(list?: string[], fallback?: string) {
    if (list?.length) {
      return list.map((item) => item.trim()).filter(Boolean);
    }

    if (!fallback?.trim()) {
      return [];
    }

    return fallback
      .split(/\r?\n/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  private validateMixcutSpeechMarkup(
    speechTexts: string[] | undefined,
    options: {
      context: string;
      voiceId?: string;
      voiceType?: 'builtin' | 'cloned';
    },
  ) {
    if (!speechTexts?.length) {
      return;
    }

    const allowedTags = this.isCosyVoiceSpeechVoice(options.voiceId, options.voiceType)
      ? MIXCUT_COSYVOICE_SSML_ALLOWED_TAGS
      : MIXCUT_SSML_ALLOWED_TAGS;

    for (const speechText of speechTexts) {
      this.validateMixcutSpeechText(speechText, options.context, allowedTags);
    }
  }

  private validateMixcutSpeechText(
    speechText: string,
    context: string,
    allowedTags: Set<string>,
  ) {
    if (typeof speechText !== 'string') {
      return;
    }

    const trimmed = speechText.trim();
    if (!trimmed || (!trimmed.includes('<') && !trimmed.includes('>'))) {
      return;
    }

    if (trimmed.includes('<!--') || trimmed.includes('<![CDATA[') || trimmed.includes('<?')) {
      throw new BadRequestException(`${context} 包含不受支持的 SSML 结构，请仅保留阿里云支持的标签`);
    }

    const firstTag = trimmed.match(/^<([a-zA-Z][\w-]*)(?:\s[^<>]*)?>/);
    const lastTag = trimmed.match(/<\/([a-zA-Z][\w-]*)>\s*$/);
    if (firstTag?.[1]?.toLowerCase() !== 'speak' || lastTag?.[1]?.toLowerCase() !== 'speak') {
      throw new BadRequestException(`${context} 使用 SSML 时必须用 <speak> 根标签包裹全文`);
    }

    const tagPattern = /<\/?([a-zA-Z][\w-]*)(?:\s[^<>]*)?\s*\/?>/g;
    const stack: string[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = tagPattern.exec(trimmed)) !== null) {
      const rawTag = match[0];
      const tagName = match[1].toLowerCase();
      const textBetween = trimmed.slice(lastIndex, match.index);
      lastIndex = match.index + rawTag.length;

      if (textBetween.includes('<') || textBetween.includes('>')) {
        throw new BadRequestException(`${context} 存在非法的 SSML 标签或未转义字符`);
      }

      if (!allowedTags.has(tagName)) {
        throw new BadRequestException(`${context} 包含当前音色不支持的 SSML 标签 <${tagName}>`);
      }

      const isClosingTag = rawTag.startsWith('</');
      const isSelfClosingTag = /\/>\s*$/.test(rawTag);
      const isImplicitBreakTag = tagName === 'break' && !isClosingTag;

      if (isClosingTag) {
        const expectedTag = stack.pop();
        if (expectedTag !== tagName) {
          throw new BadRequestException(`${context} 的 SSML 标签闭合顺序不正确`);
        }
        continue;
      }

      if (!isSelfClosingTag && !isImplicitBreakTag) {
        stack.push(tagName);
      }
    }

    const trailingText = trimmed.slice(lastIndex);
    if (trailingText.includes('<') || trailingText.includes('>')) {
      throw new BadRequestException(`${context} 存在非法的 SSML 标签或未转义字符`);
    }

    if (stack.length > 0) {
      throw new BadRequestException(`${context} 的 SSML 标签没有正确闭合`);
    }
  }

  private isCosyVoiceSpeechVoice(
    voiceId?: string,
    voiceType?: 'builtin' | 'cloned',
  ) {
    if (voiceType === 'cloned') {
      return true;
    }

    return !!voiceId && MIXCUT_COSYVOICE_VOICE_IDS.has(voiceId);
  }

  // ==================== Single Video Creation ====================

  async createVideo(
    userId: string,
    data: {
      avatarId: string;
      driveMode: 'text' | 'audio' | 'video';
      resolution: string;
      name?: string;
      voiceId?: string;
      text?: string;
      speechRate?: number;
      audioUrl?: string;
      videoUrl?: string;
      animateMode?: 'wan-std' | 'wan-pro';
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

    // Check face detection (not needed for video drive mode — animate-move has built-in check)
    if (data.driveMode !== 'video') {
      const faceDetect = (avatar.metadata as any)?.faceDetect;
      if (!faceDetect?.valid) {
        throw new BadRequestException(
          '该形象未通过人脸检测，请先进行人脸检测',
        );
      }
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

    // Validate video for video mode
    if (data.driveMode === 'video' && !data.videoUrl) {
      throw new BadRequestException('请上传参考视频');
    }

    // Deduct credits
    const cost = CREDIT_COSTS.DH_VIDEO;
    await this.userService.deductCredits(
      userId,
      cost,
      `数字人视频: ${data.name || '未命名'}`,
    );

    // Create generation record
    let job: any;
    try {
      job = await this.prisma.generation.create({
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
              : data.driveMode === 'video'
                ? { videoUrl: data.videoUrl, animateMode: data.animateMode || 'wan-std' }
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
    } catch (error) {
      this.logger.error(`DH video failed to enqueue, refunding ${cost} credits`);
      await this.userService.addCredits(userId, cost, 'REFUND', '退款: 数字人视频入队失败');
      if (job) {
        await this.prisma.generation.update({ where: { id: job.id }, data: { status: 'FAILED', errorMsg: '任务入队失败' } }).catch(() => {});
      }
      throw error;
    }

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

  // ==================== DH Batch V2 (交错混剪) ====================

  async listBuiltinAvatars() {
    const imsProvider = this.providers.batchComposeProvider;
    return imsProvider.listBuiltinAvatars();
  }

  async createDhBatchV2Job(
    userId: string,
    data: {
      channel: 'A' | 'B';
      builtinAvatarId?: string;
      avatarId?: string;
      voiceId: string;
      scriptIds: string[];
      materialIds?: string[];
      bgMusic?: string;
      videoCount: number;
      resolution: string;
      subtitleConfig?: any;
      transitionId?: string;
      speechRate?: number;
      mediaVolume?: number;
      speechVolume?: number;
      bgMusicVolume?: number;
      maxDuration?: number;
      crf?: number;
    },
  ) {
    // Validate voice
    const voice = await this.prisma.voice.findFirst({
      where: {
        voiceId: data.voiceId,
        status: 'READY',
        OR: [{ userId }, { isPublic: true }],
      },
    });
    if (!voice) throw new BadRequestException('Voice not found or not ready');

    // Channel B: validate avatar
    let avatarUrl: string | undefined;
    if (data.channel === 'B') {
      if (!data.avatarId) throw new BadRequestException('Channel B 需要选择自定义数字人形象');
      const avatar = await this.prisma.material.findFirst({
        where: { id: data.avatarId, OR: [{ userId }, { isPublic: true }] },
      });
      if (!avatar) throw new BadRequestException('Avatar not found');
      const faceDetect = (avatar.metadata as any)?.faceDetect;
      if (!faceDetect?.valid) {
        throw new BadRequestException('该形象未通过人脸检测，请先进行人脸检测');
      }
      avatarUrl = avatar.url;
    }

    // Channel A: validate builtin avatar
    if (data.channel === 'A' && !data.builtinAvatarId) {
      throw new BadRequestException('Channel A 需要选择内置数字人');
    }

    // Validate scripts
    const scripts = await this.prisma.script.findMany({
      where: { id: { in: data.scriptIds }, userId },
    });
    if (scripts.length === 0) throw new BadRequestException('No valid scripts selected');

    // Fetch materials
    let materials: any[] = [];
    if (data.materialIds?.length) {
      materials = await this.prisma.material.findMany({
        where: { id: { in: data.materialIds }, OR: [{ userId }, { isPublic: true }] },
      });
    }
    if (materials.length === 0) {
      throw new BadRequestException('交错混剪需要至少一个素材视频');
    }

    // Deduct credits
    const costPerVideo = CREDIT_COSTS.MIXCUT_PER_VIDEO;
    const totalCost = data.videoCount * costPerVideo;
    await this.userService.deductCredits(userId, totalCost, `数字人交错混剪 x${data.videoCount}`);

    // Create generation record
    let job: any;
    try {
      job = await this.prisma.generation.create({
        data: {
          userId,
          type: 'DH_BATCH_V2',
          status: 'PENDING',
          provider: data.channel === 'A' ? 'aliyun-ims-avatar' : 'aliyun-wan+ims',
          creditsUsed: totalCost,
          input: {
            channel: data.channel,
            builtinAvatarId: data.builtinAvatarId,
            avatarUrl,
            voiceId: data.voiceId,
            scripts: scripts.map((s) => ({ id: s.id, title: s.title, content: s.content })),
            materials: materials.map((m) => ({ id: m.id, name: m.name, type: m.type, url: m.url })),
            bgMusic: data.bgMusic,
            videoCount: data.videoCount,
            resolution: data.resolution,
            subtitleConfig: data.subtitleConfig,
            transitionId: data.transitionId,
            speechRate: data.speechRate,
            mediaVolume: data.mediaVolume,
            speechVolume: data.speechVolume,
            bgMusicVolume: data.bgMusicVolume,
            maxDuration: data.maxDuration,
            crf: data.crf,
          },
        },
      });

      // Dispatch to queue
      await this.dhBatchV2Queue.add(
        'dh-batch-v2',
        {
          jobId: job.id,
          userId,
          channel: data.channel,
          input: job.input,
        },
        {
          attempts: 1,
          backoff: { type: 'exponential', delay: 10000 },
        },
      );
    } catch (error) {
      this.logger.error(`DH batch v2 failed to enqueue, refunding ${totalCost} credits`);
      await this.userService.addCredits(userId, totalCost, 'REFUND', '退款: 数字人交错混剪入队失败');
      if (job) {
        await this.prisma.generation.update({ where: { id: job.id }, data: { status: 'FAILED', errorMsg: '任务入队失败' } }).catch(() => {});
      }
      throw error;
    }

    this.logger.log(`DhBatchV2 job ${job.id} queued: channel=${data.channel}, videos=${data.videoCount}`);
    return job;
  }

  async listDhBatchV2Jobs(userId: string) {
    return this.prisma.generation.findMany({
      where: { userId, type: 'DH_BATCH_V2' },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async getDhBatchV2Job(userId: string, id: string) {
    const job = await this.prisma.generation.findFirst({
      where: { id, userId, type: 'DH_BATCH_V2' },
    });
    if (!job) throw new NotFoundException('任务不存在');
    return job;
  }
}
