import {
  IsString,
  IsArray,
  IsOptional,
  IsInt,
  IsBoolean,
  IsNumber,
  Min,
  Max,
  ArrayMinSize,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class MixcutShotGroupDto {
  @IsString()
  name!: string;

  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1, { message: '每个镜头组至少需要一个素材' })
  materialUrls!: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  speechTexts?: string[];

  @IsOptional()
  @IsNumber()
  duration?: number;

  @IsOptional()
  @IsString()
  splitMode?: string; // 'NoSplit' | 'AverageSplit'

  @IsOptional()
  @IsBoolean()
  keepOriginalAudio?: boolean;
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

  @IsInt()
  @Min(1, { message: '视频数量最少为1' })
  @Max(1000, { message: '视频数量最多为1000' })
  videoCount!: number;

  @IsString()
  resolution!: string; // e.g. '1080x1920'

  // Background music
  @IsOptional()
  @IsString()
  bgMusic?: string;

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
  bgType?: 'none' | 'color' | 'blur';

  @IsOptional()
  @IsString()
  bgColor?: string;

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
}
