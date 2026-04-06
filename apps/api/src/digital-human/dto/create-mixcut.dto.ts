import {
  IsString,
  IsArray,
  IsOptional,
  IsInt,
  IsBoolean,
  IsNumber,
  IsIn,
  Min,
  Max,
  ArrayMinSize,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class MixcutMaterialDto {
  @IsString()
  url!: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  trimIn?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  trimOut?: number;
}

class MixcutShotGroupDto {
  @IsString()
  name!: string;

  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1, { message: '每个镜头组至少需要一个素材' })
  materialUrls!: string[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MixcutMaterialDto)
  materials?: MixcutMaterialDto[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  speechTexts?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  subHeadings?: string[]; // 副标题文本

  @IsOptional()
  @IsNumber()
  duration?: number;

  @IsOptional()
  @IsString()
  splitMode?: string; // 'NoSplit' | 'AverageSplit'

  @IsOptional()
  @IsBoolean()
  keepOriginalAudio?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(2)
  volume?: number; // 分组素材音量 0-2
}

class MixcutSubtitleConfigDto {
  @IsOptional() @IsString() font?: string;
  @IsOptional() @IsInt() fontSize?: number;
  @IsOptional() @IsString() fontColor?: string;
  @IsOptional() @IsNumber() fontColorOpacity?: number;
  @IsOptional() @IsString() alignment?: string;
  @IsOptional() y?: number | string;
  @IsOptional() @IsInt() outline?: number;
  @IsOptional() @IsString() outlineColour?: string;
  @IsOptional() @IsBoolean() bold?: boolean;
  @IsOptional() @IsBoolean() italic?: boolean;
  @IsOptional() @IsBoolean() underline?: boolean;
  @IsOptional() @IsString() effectColorStyleId?: string;
  @IsOptional() @IsString() bubbleStyleId?: string;
  @IsOptional() @IsString() adaptMode?: string;
  @IsOptional() @IsNumber() textWidth?: number;
}

class MixcutTitleConfigDto {
  @IsOptional() @IsBoolean() enabled?: boolean;
  @IsOptional() @IsArray() @IsString({ each: true }) titles?: string[];
  @IsOptional() @IsString() font?: string;
  @IsOptional() @IsInt() fontSize?: number;
  @IsOptional() @IsString() fontColor?: string;
  @IsOptional() @IsString() alignment?: string;
  @IsOptional() y?: number | string;
  @IsOptional() @IsString() effectColorStyleId?: string;
}

class MixcutHighlightWordDto {
  @IsString() word!: string;
  @IsOptional() @IsString() fontColor?: string;
  @IsOptional() @IsString() outlineColour?: string;
  @IsOptional() @IsBoolean() bold?: boolean;
}

class MixcutForbiddenWordDto {
  @IsString() word!: string;
  @IsOptional() @IsString() soundReplaceMode?: string; // 'mute' | 'beep'
}

export class CreateMixcutDto {
  @IsString()
  name!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MixcutShotGroupDto)
  @ArrayMinSize(1, { message: '至少需要一个镜头组' })
  shotGroups!: MixcutShotGroupDto[];

  // Speech mode: 'global' uses top-level speechTexts, 'group' uses per-group speechTexts
  @IsOptional()
  @IsString()
  speechMode?: 'global' | 'group';

  // Global speech texts (for global mode)
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  speechTexts?: string[];

  // Voice ID for TTS (CosyVoice clone ID or preset)
  @IsOptional()
  @IsString()
  voiceId?: string;

  // Voice type: 'builtin' for IMS system voices, 'cloned' for user-cloned voices
  @IsOptional()
  @IsString()
  voiceType?: 'builtin' | 'cloned';

  @IsInt()
  @Min(1, { message: '视频数量最少为1' })
  @Max(100, { message: '视频数量最多为100' })
  videoCount!: number;

  @IsString()
  resolution!: string; // e.g. '1080x1920'

  // Background music
  @IsOptional()
  @IsString()
  bgMusic?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  bgMusicList?: string[];

  @IsOptional()
  @IsNumber()
  bgMusicVolume?: number;

  // Media volume
  @IsOptional()
  @IsNumber()
  mediaVolume?: number;

  // Speech volume
  @IsOptional()
  @IsNumber()
  speechVolume?: number;

  @IsOptional()
  @IsNumber()
  speechRate?: number;

  @IsOptional()
  @IsIn(['zh', 'en'])
  speechLanguage?: 'zh' | 'en';

  // Subtitle
  @IsOptional()
  @ValidateNested()
  @Type(() => MixcutSubtitleConfigDto)
  subtitleConfig?: MixcutSubtitleConfigDto;

  // Title
  @IsOptional()
  @ValidateNested()
  @Type(() => MixcutTitleConfigDto)
  titleConfig?: MixcutTitleConfigDto;

  // Highlight words
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MixcutHighlightWordDto)
  highlightWords?: MixcutHighlightWordDto[];

  // Forbidden words (违禁词消音)
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MixcutForbiddenWordDto)
  forbiddenWords?: MixcutForbiddenWordDto[];

  // Transition
  @IsOptional()
  @IsBoolean()
  transitionEnabled?: boolean;

  @IsOptional()
  @IsNumber()
  transitionDuration?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  transitionList?: string[];

  @IsOptional()
  @IsBoolean()
  useUniformTransition?: boolean;

  // Filter
  @IsOptional()
  @IsBoolean()
  filterEnabled?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  filterList?: string[];

  // VFX Effects
  @IsOptional()
  @IsBoolean()
  vfxEffectEnabled?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  vfxEffectProbability?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  vfxFirstClipEffectList?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  vfxNotFirstClipEffectList?: string[];

  // Background
  @IsOptional()
  @IsString()
  bgType?: 'none' | 'color' | 'blur' | 'image';

  @IsOptional()
  @IsString()
  bgColor?: string;

  @IsOptional()
  @IsString()
  bgImage?: string; // 自定义背景图 URL

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  bgImageList?: string[];

  // 模糊背景半径
  @IsOptional()
  @IsNumber()
  @Min(0.01)
  @Max(1)
  bgBlurRadius?: number;

  // Scheduled publishing
  @IsOptional()
  @IsString()
  scheduledAt?: string;

  // Max duration per video
  @IsOptional()
  @IsInt()
  @Min(5)
  @Max(300)
  maxDuration?: number;

  // CRF quality
  @IsOptional()
  @IsInt()
  @Min(18)
  @Max(35)
  crf?: number;

  // 快速预览模式（不消耗完整渲染资源）
  @IsOptional()
  @IsBoolean()
  generatePreviewOnly?: boolean;

  // 固定视频时长（与 maxDuration 互斥）
  @IsOptional()
  @IsInt()
  @Min(5)
  @Max(300)
  fixedDuration?: number;

  // 镜头切片时长（素材自动切片后每段时长）
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(30)
  singleShotDuration?: number;

  // 图片展示时长
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(60)
  imageDuration?: number;

  // 对齐模式: AutoSpeed(自动变速) | Cut(裁切)
  @IsOptional()
  @IsString()
  alignmentMode?: string;

  // 二创去重
  @IsOptional()
  dedupConfig?: {
    smartCrop?: boolean;
    smartZoom?: boolean;
    smartMirror?: boolean;
    transparentMask?: boolean;
    randomSpeed?: boolean;
  };

  // 封面配置
  @IsOptional()
  @IsString()
  coverType?: 'auto' | 'custom' | 'smart';

  @IsOptional()
  @IsString()
  coverUrl?: string;

  @IsOptional()
  coverConfig?: {
    coverTitle?: string;
    coverTitleFont?: string;
    coverTitleColor?: string;
    coverTitleSize?: number;
    coverTitlePosition?: 'top' | 'center' | 'bottom';
  };

  // 水印
  @IsOptional()
  @IsString()
  watermarkText?: string;

  @IsOptional()
  @IsString()
  watermarkPosition?: 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight';

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  watermarkOpacity?: number;

  // 贴纸
  @IsOptional()
  @IsArray()
  stickers?: { url: string; x: number; y: number; width: number; height: number; opacity?: number; dyncFrames?: number }[];

  // 矩阵发布
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  publishPlatforms?: string[];
}
