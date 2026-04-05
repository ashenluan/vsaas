import {
  IsString,
  IsOptional,
  IsInt,
  IsNumber,
  IsBoolean,
  Min,
  Max,
  MinLength,
  MaxLength,
} from 'class-validator';

export class CreateImageDto {
  @IsString()
  @MinLength(1, { message: '请输入提示词' })
  @MaxLength(2000)
  prompt!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  negativePrompt?: string;

  @IsInt()
  @Min(256)
  @Max(4096)
  width!: number;

  @IsInt()
  @Min(256)
  @Max(4096)
  height!: number;

  @IsString()
  @MinLength(1, { message: '请选择模型供应商' })
  providerId!: string;

  @IsInt()
  @Min(1)
  @Max(10)
  count!: number;

  @IsOptional()
  @IsString()
  style?: string;

  @IsOptional()
  @IsString()
  model?: string;

  @IsOptional()
  @IsString()
  resolution?: string;

  @IsOptional()
  @IsString()
  outputSize?: string;

  @IsOptional()
  @IsNumber()
  seed?: number;

  @IsOptional()
  @IsBoolean()
  promptExtend?: boolean;

  @IsOptional()
  @IsString()
  referenceImage?: string;
}
