import {
  IsString,
  IsOptional,
  IsInt,
  IsBoolean,
  IsArray,
  Min,
  Max,
  MinLength,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class MediaItem {
  @IsString()
  type!: string; // 'reference_image' | 'reference_video' | 'first_frame'

  @IsString()
  url!: string;

  @IsOptional()
  @IsString()
  reference_voice?: string;
}

export class CreateVideoDto {
  @IsString()
  @MinLength(1, { message: '请输入提示词' })
  @MaxLength(5000)
  prompt!: string;

  @IsString()
  @MinLength(1, { message: '请选择模型供应商' })
  providerId!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(300)
  duration?: number;

  @IsOptional()
  @IsString()
  resolution?: string;

  @IsOptional()
  @IsString()
  referenceImage?: string;

  // R2V fields
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MediaItem)
  media?: MediaItem[];

  @IsOptional()
  @IsString()
  ratio?: string;

  @IsOptional()
  @IsString()
  negativePrompt?: string;

  @IsOptional()
  @IsBoolean()
  promptExtend?: boolean;
}
