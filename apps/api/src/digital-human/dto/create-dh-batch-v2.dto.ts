import {
  IsString,
  IsArray,
  IsOptional,
  IsInt,
  IsNumber,
  Min,
  Max,
  ArrayMinSize,
  ValidateNested,
  IsBoolean,
  IsIn,
} from 'class-validator';
import { Type } from 'class-transformer';

class DhV2SubtitleConfigDto {
  @IsOptional() @IsBoolean() open?: boolean;
  @IsOptional() @IsString() style?: string;
  @IsOptional() @IsString() font?: string;
  @IsOptional() @IsInt() fontSize?: number;
  @IsOptional() @IsString() fontColor?: string;
}

export class CreateDhBatchV2Dto {
  /** 通道: A = IMS内置数字人, B = 自定义照片S2V */
  @IsString()
  @IsIn(['A', 'B'], { message: '通道必须为 A 或 B' })
  channel!: 'A' | 'B';

  /** Channel A: 内置数字人 ID */
  @IsOptional()
  @IsString()
  builtinAvatarId?: string;

  /** Channel B: 自定义头像素材 ID */
  @IsOptional()
  @IsString()
  avatarId?: string;

  /** 克隆语音 ID */
  @IsString()
  voiceId!: string;

  /** 脚本 ID 列表 */
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1, { message: '请选择至少一个脚本' })
  scriptIds!: string[];

  /** 素材 ID 列表 */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  materialIds?: string[];

  /** 背景音乐 URL */
  @IsOptional()
  @IsString()
  bgMusic?: string;

  /** 输出视频数量 */
  @IsInt()
  @Min(1, { message: '视频数量最少为1' })
  @Max(50, { message: '视频数量最多为50' })
  videoCount!: number;

  /** 分辨率 e.g. '1080x1920' */
  @IsString()
  resolution!: string;

  /** 字幕配置 */
  @IsOptional()
  @ValidateNested()
  @Type(() => DhV2SubtitleConfigDto)
  subtitleConfig?: DhV2SubtitleConfigDto;

  /** 转场效果 ID */
  @IsOptional()
  @IsString()
  transitionId?: string;

  /** 语速调整 */
  @IsOptional()
  @IsNumber()
  speechRate?: number;

  /** 素材音量 */
  @IsOptional()
  @IsNumber()
  mediaVolume?: number;

  /** 口播音量 */
  @IsOptional()
  @IsNumber()
  speechVolume?: number;

  /** 背景音乐音量 */
  @IsOptional()
  @IsNumber()
  bgMusicVolume?: number;

  /** 最大视频时长(秒) */
  @IsOptional()
  @IsInt()
  @Min(5)
  @Max(300)
  maxDuration?: number;

  /** CRF 质量 */
  @IsOptional()
  @IsInt()
  @Min(18)
  @Max(35)
  crf?: number;
}
