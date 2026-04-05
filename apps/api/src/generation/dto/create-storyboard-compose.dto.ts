import {
  IsString,
  IsOptional,
  IsInt,
  IsNumber,
  IsArray,
  Min,
  Max,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class StoryboardVideoItem {
  @IsString()
  url!: string;

  @IsNumber()
  @Min(0)
  duration!: number;
}

export class CreateStoryboardComposeDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StoryboardVideoItem)
  videos!: StoryboardVideoItem[];

  @IsOptional()
  @IsString()
  transition?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(10)
  transitionDuration?: number;

  @IsInt()
  @Min(240)
  @Max(4096)
  width!: number;

  @IsInt()
  @Min(240)
  @Max(4096)
  height!: number;

  @IsOptional()
  @IsString()
  bgMusicUrl?: string;
}
