import {
  IsString,
  IsArray,
  IsOptional,
  IsInt,
  Min,
  Max,
  IsBoolean,
  IsNumber,
  ArrayMinSize,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class SubtitleConfigDto {
  @IsOptional() @IsString() font?: string;
  @IsOptional() @IsInt() fontSize?: number;
  @IsOptional() @IsString() fontColor?: string;
  @IsOptional() @IsNumber() fontColorOpacity?: number;
  @IsOptional() @IsString() alignment?: string;
  @IsOptional() y?: number | string;
  @IsOptional() @IsString() adaptMode?: string;
  @IsOptional() @IsInt() outline?: number;
  @IsOptional() @IsString() outlineColour?: string;
  @IsOptional() @IsInt() shadow?: number;
  @IsOptional() @IsString() backColour?: string;
  @IsOptional() @IsNumber() textWidth?: number;
  @IsOptional() @IsString() effectColorStyleId?: string;
  @IsOptional() @IsString() bubbleStyleId?: string;
  @IsOptional() @IsBoolean() bold?: boolean;
  @IsOptional() @IsBoolean() italic?: boolean;
  @IsOptional() @IsBoolean() underline?: boolean;
}

class TitleConfigDto {
  @IsOptional() @IsArray() @IsString({ each: true }) titles?: string[];
  @IsOptional() @IsString() font?: string;
  @IsOptional() @IsInt() fontSize?: number;
  @IsOptional() @IsString() fontColor?: string;
  @IsOptional() @IsString() alignment?: string;
  @IsOptional() y?: number | string;
  @IsOptional() @IsString() effectColorStyleId?: string;
}

class EffectsConfigDto {
  @IsOptional() @IsBoolean() allowEffects?: boolean;
  @IsOptional() @IsNumber() vfxEffectProbability?: number;
  @IsOptional() @IsArray() @IsString({ each: true }) vfxFirstClipEffectList?: string[];
  @IsOptional() @IsArray() @IsString({ each: true }) vfxNotFirstClipEffectList?: string[];
}

class TransitionConfigDto {
  @IsOptional() @IsBoolean() allowTransition?: boolean;
  @IsOptional() @IsNumber() transitionDuration?: number;
  @IsOptional() @IsArray() @IsString({ each: true }) transitionList?: string[];
  @IsOptional() @IsBoolean() useUniformTransition?: boolean;
}

class FilterConfigDto {
  @IsOptional() @IsBoolean() allowFilter?: boolean;
  @IsOptional() @IsArray() @IsString({ each: true }) filterList?: string[];
}

class HighlightWordDto {
  @IsString() word!: string;
  @IsOptional() @IsString() fontColor?: string;
  @IsOptional() @IsString() outlineColour?: string;
  @IsOptional() @IsBoolean() bold?: boolean;
}

class ForbiddenWordDto {
  @IsString() word!: string;
  @IsOptional() @IsString() soundReplaceMode?: string;
}

export class CreateComposeDto {
  @IsString()
  voiceId!: string;

  @IsString()
  avatarId!: string;

  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1, { message: '请选择至少一个脚本' })
  scriptIds!: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  materialIds?: string[];

  @IsOptional()
  @IsString()
  bgMusic?: string;

  @IsInt()
  @Min(1, { message: '视频数量最少为1' })
  @Max(100, { message: '视频数量最多为100' })
  videoCount!: number;

  @IsString()
  resolution!: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => SubtitleConfigDto)
  subtitleConfig?: SubtitleConfigDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => TitleConfigDto)
  titleConfig?: TitleConfigDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => EffectsConfigDto)
  effectsConfig?: EffectsConfigDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => TransitionConfigDto)
  transitionConfig?: TransitionConfigDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => FilterConfigDto)
  filterConfig?: FilterConfigDto;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => HighlightWordDto)
  highlightWords?: HighlightWordDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ForbiddenWordDto)
  forbiddenWords?: ForbiddenWordDto[];

  // Background
  @IsOptional()
  @IsString()
  bgType?: 'none' | 'color' | 'blur' | 'image';

  @IsOptional()
  @IsString()
  bgColor?: string;

  @IsOptional()
  @IsString()
  bgImage?: string;

  @IsOptional()
  @IsNumber()
  @Min(0.01)
  @Max(1)
  bgBlurRadius?: number;

  // Stickers
  @IsOptional()
  @IsArray()
  stickers?: { url: string; x: number; y: number; width: number; height: number; opacity?: number; dyncFrames?: number }[];

  // Dedup
  @IsOptional()
  dedupConfig?: {
    smartCrop?: boolean;
    smartZoom?: boolean;
    smartMirror?: boolean;
    transparentMask?: boolean;
    randomSpeed?: boolean;
  };

  // Cover
  @IsOptional()
  @IsString()
  coverType?: 'auto' | 'custom' | 'smart';

  @IsOptional()
  coverConfig?: {
    coverTitle?: string;
    coverTitleFont?: string;
    coverTitleColor?: string;
    coverTitleSize?: number;
    coverTitlePosition?: 'top' | 'center' | 'bottom';
  };

  @IsOptional()
  @IsInt()
  @Min(5)
  @Max(180)
  maxDuration?: number;

  @IsOptional()
  @IsInt()
  @Min(18)
  @Max(35)
  crf?: number;

  @IsOptional()
  @IsNumber()
  speechRate?: number;

  @IsOptional()
  @IsNumber()
  mediaVolume?: number;

  @IsOptional()
  @IsNumber()
  speechVolume?: number;

  @IsOptional()
  @IsNumber()
  bgMusicVolume?: number;
}
