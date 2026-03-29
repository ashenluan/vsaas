import {
  IsString,
  IsOptional,
  IsInt,
  IsArray,
  IsEnum,
  Min,
  Max,
  MinLength,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum AdvancedImageType {
  STYLE_COPY = 'STYLE_COPY',
  TEXT_EDIT = 'TEXT_EDIT',
  HANDHELD_PRODUCT = 'HANDHELD_PRODUCT',
  MULTI_FUSION = 'MULTI_FUSION',
  VIRTUAL_TRYON = 'VIRTUAL_TRYON',
  INPAINT = 'INPAINT',
}

class TextEditItem {
  @IsString()
  original!: string;

  @IsString()
  replacement!: string;
}

export class CreateAdvancedImageDto {
  @IsEnum(AdvancedImageType)
  type!: AdvancedImageType;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  prompt?: string;

  // STYLE_COPY
  @IsOptional()
  @IsString()
  referenceImage?: string;

  // TEXT_EDIT
  @IsOptional()
  @IsString()
  sourceImage?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TextEditItem)
  textEdits?: TextEditItem[];

  // HANDHELD_PRODUCT
  @IsOptional()
  @IsString()
  productImage?: string;

  @IsOptional()
  @IsString()
  personImage?: string;

  // MULTI_FUSION
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];

  @IsOptional()
  @IsString()
  fusionMode?: string;

  // VIRTUAL_TRYON
  @IsOptional()
  @IsString()
  clothingImage?: string;

  // INPAINT
  @IsOptional()
  @IsString()
  maskImage?: string;

  // Common
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  count?: number;
}
