import {
  IsString,
  IsOptional,
  IsInt,
  Min,
  Max,
  MinLength,
  MaxLength,
} from 'class-validator';

export class CreateVideoDto {
  @IsString()
  @MinLength(1, { message: '请输入提示词' })
  @MaxLength(2000)
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
}
