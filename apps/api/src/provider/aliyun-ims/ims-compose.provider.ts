import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import ICE20201109, * as $ICE20201109 from '@alicloud/ice20201109';
import * as $OpenApi from '@alicloud/openapi-client';
import * as $Util from '@alicloud/tea-util';

export interface BatchComposeProvider {
  readonly providerId: string;
  readonly displayName: string;
  isAvailable(): Promise<boolean>;
  submitBatchJob(inputConfig: any, editingConfig: any, outputConfig: any, callbackUrl?: string, callbackToken?: string): Promise<{ jobId: string }>;
  checkJobStatus(jobId: string): Promise<{ status: string; subJobs?: any[]; progress?: number }>;
}

// ========== 转场效果枚举 ==========
export const TRANSITION_LIST = [
  'directional', 'displacement', 'windowslice', 'bowTieVertical', 'bowTieHorizontal',
  'simplezoom', 'linearblur', 'waterdrop', 'glitchmemories', 'polka', 'perlin',
  'directionalwarp', 'bounce_up', 'bounce_down', 'wiperight', 'wipeleft', 'wipedown',
  'wipeup', 'morph', 'colordistance', 'circlecrop', 'swirl', 'dreamy', 'gridflip',
  'zoomincircles', 'radial', 'mosaic', 'undulatingburnout', 'crosshatch',
  'crazyparametricfun', 'kaleidoscope', 'windowblinds', 'hexagonalize', 'glitchdisplace',
  'dreamyzoom', 'doomscreentransition_up', 'doomscreentransition_down', 'ripple',
  'pinwheel', 'angular', 'burn', 'circle', 'circleopen', 'colorphase', 'crosswarp',
  'cube', 'directionalwipe', 'doorway', 'fade', 'fadecolor', 'fadegrayscale', 'flyeye',
  'heart', 'luma', 'multiplyblend', 'pixelize', 'polarfunction', 'randomsquares',
  'rotatescalefade', 'squareswire', 'squeeze', 'swap', 'wind',
] as const;

// ========== 特效效果枚举 ==========
export const VFX_EFFECT_LIST = {
  basic: [
    'open', 'close', 'h_blur', 'v_blur', 'blur', 'slightshake', 'zoominout', 'movie',
    'zoomslight', 'color_difference', 'withcircleopen', 'withcircleclose', 'withcircleshake',
    'withcircleflashlight', 'disappear', 'shock', 'bluropen', 'blurclose', 'photograph',
    'black', 'blurring', 'color_to_grey', 'grey_to_color', 'slightrectshow', 'slightshow',
    'wipecross', 'whiteshow', 'image_in_image',
  ],
  atmosphere: [
    'colorfulradial', 'colorfulstarry', 'flyfire', 'heartfireworks', 'meteorshower',
    'moons_and_stars', 'sparklestarfield', 'spotfall', 'starexplosion', 'starry',
  ],
  dynamic: [
    'white', 'minus_glitter', 'jitter', 'soulout', 'scanlight', 'swing', 'heartbeat',
    'flashingscreen', 'illusion', 'segmentation', 'neolighting', 'curl', 'shine',
    'smalljitter', 'flashinglight', 'windowblur', 'windowblur2', 'kaleidoscope',
  ],
  light: [
    'moon_projection', 'star_projection', 'heart_projection', 'sunset_projection',
    'carwindow_projection', 'shinningstar_light', 'anglelight', 'darknight_rainbow',
    'fallingcircle', 'lightcenter', 'lightsweep', 'moon', 'rotationspotlight',
  ],
  retro: ['blackwhitetv', 'edgescan', 'oldtv', 'oldtvshine', 'nightvision', 'tvshow'],
  dreamy: [
    'colorfulsun', 'bigsun', 'fallingheart', 'colorfulfireworks', 'heartshot',
    'starfieldshinee', 'starfieldshinee2', 'fireworks', 'heartsurround',
    'risingheartbubble', 'starfield', 'colorfulripples', 'colorfulbubbles',
    'heartbubbleshinee', 'starsparkle',
  ],
  nature: ['rainy', 'waterripple', 'snow', 'foggy', 'meteor', 'stormlaser', 'simpleripple', 'fadeshadow'],
  splitScreen: [
    'marquee', 'livesplit', 'splitstill2', 'splitstill3', 'splitstill4', 'splitstill9',
    'splitstill6', 'blackwhitesplit', 'blurthreesplit',
  ],
  color: ['colorful', 'blackfade', 'rainbowfilter', 'movingrainbow', 'discolights'],
  deform: ['fisheye', 'mosaic_rect', 'glass', 'planet'],
};

// ========== 滤镜效果枚举 ==========
export const FILTER_LIST = {
  modern90s: ['m1', 'm2', 'm3', 'm4', 'm5', 'm6', 'm7', 'm8'],
  film: ['pf1', 'pf2', 'pf3', 'pf4', 'pf5', 'pf6', 'pf7', 'pf8', 'pf9', 'pfa', 'pfb', 'pfc'],
  infrared: ['pi1', 'pi2', 'pi3', 'pi4'],
  fresh: ['pl1', 'pl2', 'pl3', 'pl4'],
  japanese: ['pj1', 'pj2', 'pj3', 'pj4'],
  unsplash: ['delta', 'electric', 'faded', 'slowlived', 'tokoyo', 'urbex', 'warm'],
  negative80s: ['f1', 'f2', 'f3', 'f4', 'f5', 'f6', 'f7'],
  travel: ['pv1', 'pv2', 'pv3', 'pv4', 'pv5', 'pv6'],
  art90s: ['a1', 'a2', 'a3', 'a4', 'a5', 'a6'],
};

// ========== 花字模板 ==========
export const SUBTITLE_STYLE_LIST = [
  'CS0001-000011', 'CS0001-000004', 'CS0001-000005', 'CS0001-000014', 'CS0001-000007',
  'CS0002-000002', 'CS0002-000004', 'CS0002-000009', 'CS0002-000016',
];

// ========== 气泡字模板 ==========
export const BUBBLE_STYLE_LIST = [
  'BS0001-000001', 'BS0001-000002', 'BS0001-000003', 'BS0001-000004', 'BS0001-000005',
  'BS0002-000001', 'BS0002-000002', 'BS0002-000003', 'BS0002-000004', 'BS0002-000005',
];

@Injectable()
export class AliyunIMSProvider implements BatchComposeProvider {
  readonly providerId = 'aliyun-ims';
  readonly displayName = '阿里云智能媒体成片';
  private readonly logger = new Logger(AliyunIMSProvider.name);
  private client: ICE20201109 | null = null;

  constructor(private readonly config: ConfigService) {}

  private getClient(): ICE20201109 {
    if (!this.client) {
      const accessKeyId = this.config.get<string>('ALIYUN_ACCESS_KEY_ID', '');
      const accessKeySecret = this.config.get<string>('ALIYUN_ACCESS_KEY_SECRET', '');
      const region = this.config.get<string>('ALIYUN_IMS_REGION', 'cn-shanghai');

      const config = new $OpenApi.Config({
        accessKeyId,
        accessKeySecret,
        endpoint: `ice.${region}.aliyuncs.com`,
      });
      this.client = new ICE20201109(config);
    }
    return this.client;
  }

  async isAvailable(): Promise<boolean> {
    return !!this.config.get<string>('ALIYUN_ACCESS_KEY_ID') && !!this.config.get<string>('ALIYUN_ACCESS_KEY_SECRET');
  }

  async submitBatchJob(
    inputConfig: any,
    editingConfig: any,
    outputConfig: any,
    callbackUrl?: string,
    callbackToken?: string,
  ): Promise<{ jobId: string }> {
    this.logger.log('Submitting batch media producing job to Aliyun IMS');

    const client = this.getClient();

    const request = new $ICE20201109.SubmitBatchMediaProducingJobRequest({
      inputConfig: JSON.stringify(inputConfig),
      editingConfig: JSON.stringify(editingConfig),
      outputConfig: JSON.stringify(outputConfig),
    });

    // Set callback URL via UserData if provided
    if (callbackUrl) {
      const userData: any = { NotifyAddress: callbackUrl };
      if (callbackToken) {
        userData.CallbackToken = callbackToken;
      }
      request.userData = JSON.stringify(userData);
    }

    const runtime = new $Util.RuntimeOptions({});

    try {
      const response = await client.submitBatchMediaProducingJobWithOptions(request, runtime);
      const jobId = response.body?.jobId || '';
      this.logger.log(`IMS batch job submitted: ${jobId}`);
      return { jobId };
    } catch (error: any) {
      this.logger.error(`IMS submit failed: ${error.message}`);
      throw new Error(`IMS batch job submit failed: ${error.message}`);
    }
  }

  async checkJobStatus(jobId: string): Promise<{ status: string; subJobs?: any[]; progress?: number }> {
    this.logger.log(`Checking IMS job status: ${jobId}`);

    const client = this.getClient();

    const request = new $ICE20201109.GetBatchMediaProducingJobRequest({ jobId });
    const runtime = new $Util.RuntimeOptions({});

    try {
      const response = await client.getBatchMediaProducingJobWithOptions(request, runtime);
      const job = response.body?.editingBatchJob;

      if (!job) {
        return { status: 'UNKNOWN', progress: 0 };
      }

      // Parse sub-jobs for progress
      const subJobs: any[] = (job.subJobList as any[]) || [];
      const total = subJobs.length || 1;
      const completed = subJobs.filter(
        (sj: any) => sj.status === 'Success' || sj.status === 'Failed',
      ).length;
      const progress = Math.round((completed / total) * 100);

      // Map IMS status to our status
      let status = 'PROCESSING';
      if (job.status === 'Finished') status = 'Finished';
      else if (job.status === 'Failed') {
        // Parse error from extend field
        let errorDetail = '';
        try {
          const ext = JSON.parse(job.extend || '{}');
          errorDetail = ext.ErrorMessage || ext.ErrorCode || '';
        } catch { /* ignore */ }
        this.logger.error(`IMS job ${jobId} failed: ${errorDetail || 'unknown error'}`);
        status = 'Failed';
      } else if (job.status === 'Init') status = 'PENDING';

      // Check if all sub-jobs failed
      const allFailed = subJobs.length > 0 && subJobs.every((sj: any) => sj.status === 'Failed');
      if (allFailed) status = 'Failed';

      return {
        status,
        progress,
        subJobs: subJobs.map((sj: any) => ({
          mediaId: sj.mediaId,
          mediaURL: sj.mediaURL,
          duration: sj.duration,
          status: sj.status,
          errorCode: sj.errorCode,
          errorMessage: sj.errorMessage,
        })),
      };
    } catch (error: any) {
      this.logger.error(`IMS status check failed: ${error.message}`);
      throw new Error(`IMS status check failed: ${error.message}`);
    }
  }

  /**
   * 构建 InputConfig — 输入素材配置
   */
  buildInputConfig(config: {
    mode: 'global' | 'group';
    mediaGroups: {
      groupName: string;
      mediaUrls: string[];
      speechTexts?: string[];
      duration?: number;
      splitMode?: string;
    }[];
    speechTexts?: string[];
    titles?: string[];
    subHeadings?: { level: number; titles: string[] }[];
    backgroundMusic?: string[];
    stickers?: { url: string; x: number; y: number; width: number; height: number; opacity?: number; dyncFrames?: number }[];
    backgroundImages?: string[];
  }): any {
    const inputConfig: any = {
      MediaGroupArray: config.mediaGroups.map((g) => ({
        GroupName: g.groupName,
        MediaArray: g.mediaUrls,
        ...(g.speechTexts && { SpeechTextArray: g.speechTexts }),
        ...(g.duration && { Duration: g.duration }),
        ...(g.splitMode && { SplitMode: g.splitMode }),
      })),
    };

    if (config.speechTexts?.length) inputConfig.SpeechTextArray = config.speechTexts;
    if (config.titles?.length) inputConfig.TitleArray = config.titles;
    if (config.backgroundMusic?.length) inputConfig.BackgroundMusicArray = config.backgroundMusic;
    if (config.backgroundImages?.length) inputConfig.BackgroundImageArray = config.backgroundImages;

    if (config.subHeadings?.length) {
      inputConfig.SubHeadingArray = config.subHeadings.map((sh) => ({
        Level: sh.level,
        TitleArray: sh.titles,
      }));
    }

    if (config.stickers?.length) {
      inputConfig.StickerArray = config.stickers.map((s) => ({
        MediaURL: s.url,
        X: s.x, Y: s.y, Width: s.width, Height: s.height,
        ...(s.opacity !== undefined && { Opacity: s.opacity }),
        ...(s.dyncFrames !== undefined && { DyncFrames: s.dyncFrames }),
      }));
    }

    return inputConfig;
  }

  /**
   * 构建 EditingConfig — 剪辑配置
   * 包含：字幕、特效、转场、滤镜、人声等完整配置
   */
  buildEditingConfig(config: {
    // 媒体音量
    mediaVolume?: number;
    // 口播配置
    speechVolume?: number;
    speechRate?: number;
    customizedVoice?: string;
    voice?: string;
    speechStyle?: string;
    speechLanguage?: string;
    // 字幕配置 (AsrConfig)
    subtitleConfig?: {
      font?: string;
      fontUrl?: string;
      fontSize?: number;
      fontColor?: string;
      fontColorOpacity?: number;
      alignment?: string;
      x?: number | string;
      y?: number | string;
      adaptMode?: string;
      textWidth?: number;
      outline?: number;
      outlineColour?: string;
      shadow?: number;
      backColour?: string;
      effectColorStyleId?: string;
      bubbleStyleId?: string;
      bold?: boolean;
      italic?: boolean;
      underline?: boolean;
    };
    // 特殊词汇配置
    specialWordsConfig?: {
      type: 'Highlight' | 'Forbidden';
      wordsList: string[];
      style?: {
        fontName?: string;
        fontSize?: number;
        fontColor?: string;
        outlineColour?: string;
        outline?: number;
        bold?: boolean;
        italic?: boolean;
        underline?: boolean;
      };
      soundReplaceMode?: string;
    }[];
    // 标题配置
    titleConfig?: {
      font?: string;
      fontSize?: number;
      fontColor?: string;
      alignment?: string;
      y?: number | string;
      adaptMode?: string;
      effectColorStyleId?: string;
    };
    // 副标题配置
    subHeadingConfig?: Record<string, {
      y?: number | string;
      fontSize?: number;
      fontColor?: string;
      alignment?: string;
    }>;
    // 背景音乐
    backgroundMusicVolume?: number;
    backgroundMusicStyle?: string;
    // 背景图
    backgroundImageType?: string;
    backgroundImageRadius?: number;
    // 处理配置
    singleShotDuration?: number;
    enableClipSplit?: boolean;
    imageDuration?: number;
    // 特效
    allowEffects?: boolean;
    vfxEffectProbability?: number;
    vfxFirstClipEffectList?: string[];
    vfxNotFirstClipEffectList?: string[];
    // 转场
    allowTransition?: boolean;
    transitionDuration?: number;
    transitionList?: string[];
    useUniformTransition?: boolean;
    // 滤镜
    allowFilter?: boolean;
    filterList?: string[];
    // 对齐模式
    alignmentMode?: string;
  }): any {
    const editingConfig: any = {
      MediaConfig: { Volume: config.mediaVolume ?? 1 },
      SpeechConfig: {
        Volume: config.speechVolume ?? 1,
        SpeechRate: config.speechRate ?? 0,
        ...(config.customizedVoice && { CustomizedVoice: config.customizedVoice }),
        ...(config.voice && { Voice: config.voice }),
        ...(config.speechStyle && { Style: config.speechStyle }),
        ...(config.speechLanguage && { SpeechLanguage: config.speechLanguage }),
      },
      BackgroundMusicConfig: {
        Volume: config.backgroundMusicVolume ?? 0.2,
        ...(config.backgroundMusicStyle && { Style: config.backgroundMusicStyle }),
      },
      ProcessConfig: {
        SingleShotDuration: config.singleShotDuration ?? 3,
        ...(config.enableClipSplit !== undefined && { EnableClipSplit: config.enableClipSplit }),
        ...(config.imageDuration && { ImageDuration: config.imageDuration }),
        // 特效
        AllowVfxEffect: config.allowEffects ?? false,
        ...(config.vfxEffectProbability !== undefined && { VfxEffectProbability: config.vfxEffectProbability }),
        ...(config.vfxFirstClipEffectList?.length && { VfxFirstClipEffectList: config.vfxFirstClipEffectList }),
        ...(config.vfxNotFirstClipEffectList?.length && { VfxNotFirstClipEffectList: config.vfxNotFirstClipEffectList }),
        // 转场
        AllowTransition: config.allowTransition ?? false,
        ...(config.transitionDuration && { TransitionDuration: config.transitionDuration }),
        ...(config.transitionList?.length && { TransitionList: config.transitionList }),
        ...(config.useUniformTransition !== undefined && { UseUniformTransition: config.useUniformTransition }),
        // 滤镜
        AllowFilter: config.allowFilter ?? false,
        ...(config.filterList?.length && { FilterList: config.filterList }),
        // 对齐
        ...(config.alignmentMode && { AlignmentMode: config.alignmentMode }),
      },
    };

    // 字幕配置 (通过 AsrConfig)
    if (config.subtitleConfig) {
      const sc = config.subtitleConfig;
      const asrConfig: any = {};
      if (sc.font) asrConfig.Font = sc.font;
      if (sc.fontUrl) asrConfig.FontUrl = sc.fontUrl;
      if (sc.fontSize) asrConfig.FontSize = sc.fontSize;
      if (sc.fontColor) asrConfig.FontColor = sc.fontColor;
      if (sc.fontColorOpacity !== undefined) asrConfig.FontColorOpacity = sc.fontColorOpacity;
      if (sc.alignment) asrConfig.Alignment = sc.alignment;
      if (sc.x !== undefined) asrConfig.X = sc.x;
      if (sc.y !== undefined) asrConfig.Y = sc.y;
      if (sc.adaptMode) asrConfig.AdaptMode = sc.adaptMode;
      if (sc.textWidth) asrConfig.TextWidth = sc.textWidth;
      if (sc.outline !== undefined) asrConfig.Outline = sc.outline;
      if (sc.outlineColour) asrConfig.OutlineColour = sc.outlineColour;
      if (sc.shadow !== undefined) asrConfig.Shadow = sc.shadow;
      if (sc.backColour) asrConfig.BackColour = sc.backColour;
      if (sc.effectColorStyleId) asrConfig.EffectColorStyleId = sc.effectColorStyleId;
      if (sc.bubbleStyleId) asrConfig.BubbleStyleId = sc.bubbleStyleId;
      if (sc.bold || sc.italic || sc.underline) {
        asrConfig.FontFace = {
          ...(sc.bold && { Bold: true }),
          ...(sc.italic && { Italic: true }),
          ...(sc.underline && { Underline: true }),
        };
      }
      editingConfig.SpeechConfig.AsrConfig = asrConfig;
    }

    // 特殊词汇配置
    if (config.specialWordsConfig?.length) {
      editingConfig.SpeechConfig.SpecialWordsConfig = config.specialWordsConfig.map((sw) => {
        const item: any = {
          Type: sw.type,
          WordsList: sw.wordsList,
        };
        if (sw.style) {
          item.Style = {
            ...(sw.style.fontName && { FontName: sw.style.fontName }),
            ...(sw.style.fontSize && { FontSize: sw.style.fontSize }),
            ...(sw.style.fontColor && { FontColor: sw.style.fontColor }),
            ...(sw.style.outlineColour && { OutlineColour: sw.style.outlineColour }),
            ...(sw.style.outline !== undefined && { Outline: sw.style.outline }),
            ...(sw.style.bold || sw.style.italic || sw.style.underline ? {
              FontFace: {
                ...(sw.style.bold && { Bold: true }),
                ...(sw.style.italic && { Italic: true }),
                ...(sw.style.underline && { Underline: true }),
              },
            } : {}),
          };
        }
        if (sw.type === 'Forbidden' && sw.soundReplaceMode) {
          item.SoundReplaceMode = sw.soundReplaceMode;
        }
        return item;
      });
    }

    // 标题配置
    if (config.titleConfig) {
      const tc = config.titleConfig;
      editingConfig.TitleConfig = {
        ...(tc.font && { Font: tc.font }),
        ...(tc.fontSize && { FontSize: tc.fontSize }),
        ...(tc.fontColor && { FontColor: tc.fontColor }),
        ...(tc.alignment && { Alignment: tc.alignment }),
        ...(tc.y !== undefined && { Y: tc.y }),
        ...(tc.adaptMode && { AdaptMode: tc.adaptMode }),
        ...(tc.effectColorStyleId && { EffectColorStyleId: tc.effectColorStyleId }),
      };
    }

    // 副标题配置
    if (config.subHeadingConfig) {
      editingConfig.SubHeadingConfig = {};
      for (const [level, cfg] of Object.entries(config.subHeadingConfig)) {
        editingConfig.SubHeadingConfig[level] = {
          ...(cfg.y !== undefined && { Y: cfg.y }),
          ...(cfg.fontSize && { FontSize: cfg.fontSize }),
          ...(cfg.fontColor && { FontColor: cfg.fontColor }),
          ...(cfg.alignment && { Alignment: cfg.alignment }),
        };
      }
    }

    // 背景图配置
    if (config.backgroundImageType || config.backgroundImageRadius) {
      editingConfig.BackgroundImageConfig = {
        ...(config.backgroundImageType && { Type: config.backgroundImageType }),
        ...(config.backgroundImageRadius && { Radius: config.backgroundImageRadius }),
      };
    }

    return editingConfig;
  }

  /**
   * 构建 OutputConfig — 输出配置
   */
  buildOutputConfig(config: {
    outputUrl: string;
    count: number;
    width: number;
    height: number;
    maxDuration?: number;
    crf?: number;
  }): any {
    return {
      MediaURL: config.outputUrl,
      Count: config.count,
      Width: config.width,
      Height: config.height,
      ...(config.maxDuration && { MaxDuration: config.maxDuration }),
      ...(config.crf && { Video: { Crf: config.crf } }),
    };
  }

  /**
   * 获取可用的转场效果列表
   */
  getTransitionList() {
    return TRANSITION_LIST.map((id) => ({ id, name: id }));
  }

  /**
   * 获取可用的特效效果列表（按分类）
   */
  getEffectList() {
    return VFX_EFFECT_LIST;
  }

  /**
   * 获取可用的滤镜列表（按分类）
   */
  getFilterList() {
    return FILTER_LIST;
  }

  /**
   * 获取字幕花字模板列表
   */
  getSubtitleStyleList() {
    return SUBTITLE_STYLE_LIST;
  }

  /**
   * 获取气泡字模板列表
   */
  getBubbleStyleList() {
    return BUBBLE_STYLE_LIST;
  }
}
