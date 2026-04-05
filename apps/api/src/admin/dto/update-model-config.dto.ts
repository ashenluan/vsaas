import {
  IsBoolean,
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class UpdateModelConfigDto {
  @IsOptional()
  @IsString()
  displayName?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  creditCost?: number;

  @IsOptional()
  @IsIn(['per_image', 'per_second', 'per_job'])
  costUnit?: 'per_image' | 'per_second' | 'per_job';

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsInt()
  sortOrder?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  maxDuration?: number;

  @IsOptional()
  @IsObject()
  capabilities?: Record<string, unknown>;
}
