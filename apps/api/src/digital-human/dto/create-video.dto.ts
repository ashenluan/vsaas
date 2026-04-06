import {
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  IsInt,
  IsBoolean,
  ValidateIf,
  IsNotEmpty,
  Min,
  Max,
} from 'class-validator';

export enum DigitalHumanEngine {
  IMS = 'ims',
  WAN_PHOTO = 'wan-photo',
  WAN_MOTION = 'wan-motion',
  VIDEORETALK = 'videoretalk',
}

export enum DriveMode {
  TEXT = 'text',
  AUDIO = 'audio',
  VIDEO = 'video',
}

export enum AvatarSource {
  BUILTIN = 'builtin',
  CUSTOM = 'custom',
}

export enum VoiceType {
  BUILTIN = 'builtin',
  CLONED = 'cloned',
}

export enum OutputFormat {
  MP4 = 'mp4',
  WEBM = 'webm',
}

export enum CreateVideoPreset {
  SPEED = 'speed',
  BALANCED = 'balanced',
  QUALITY = 'quality',
}

export class CreateVideoDto {
  @IsOptional()
  @IsEnum(DigitalHumanEngine)
  engine?: DigitalHumanEngine;

  @ValidateIf((o) => o.engine !== DigitalHumanEngine.IMS && o.engine !== DigitalHumanEngine.VIDEORETALK)
  @IsString()
  @IsNotEmpty({ message: '请选择数字人形象' })
  avatarId?: string;

  @ValidateIf((o) => o.engine === DigitalHumanEngine.IMS)
  @IsString()
  @IsNotEmpty({ message: '请选择内置数字人' })
  builtinAvatarId?: string;

  @IsOptional()
  @IsEnum(AvatarSource)
  avatarSource?: AvatarSource;

  @IsString()
  resolution!: string;

  @IsEnum(DriveMode)
  driveMode!: DriveMode;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEnum(CreateVideoPreset)
  preset?: CreateVideoPreset;

  @IsOptional()
  @IsEnum(VoiceType)
  voiceType?: VoiceType;

  @IsOptional()
  @IsEnum(OutputFormat)
  outputFormat?: OutputFormat;

  // Text drive fields
  @ValidateIf((o) => o.driveMode === DriveMode.TEXT)
  @IsString()
  @IsNotEmpty({ message: '请选择声音' })
  voiceId?: string;

  @ValidateIf((o) => o.driveMode === DriveMode.TEXT)
  @IsString()
  @IsNotEmpty({ message: '请输入台词文案' })
  text?: string;

  @IsOptional()
  @IsNumber()
  pitchRate?: number;

  @IsOptional()
  @IsNumber()
  volume?: number;

  @IsOptional()
  @IsString()
  backgroundUrl?: string;

  @IsOptional()
  @IsBoolean()
  loopMotion?: boolean;

  @IsOptional()
  @IsNumber()
  speechRate?: number;

  // Audio drive fields
  @ValidateIf((o) => o.driveMode === DriveMode.AUDIO)
  @IsString()
  @IsNotEmpty({ message: '请上传音频文件' })
  audioUrl?: string;

  // Video drive fields
  @ValidateIf((o) => o.driveMode === DriveMode.VIDEO || o.engine === DigitalHumanEngine.VIDEORETALK)
  @IsString()
  @IsNotEmpty({ message: '请上传参考视频' })
  videoUrl?: string;

  @IsOptional()
  @IsString()
  animateMode?: 'wan-std' | 'wan-pro';

  @IsOptional()
  @IsString()
  refImageUrl?: string;

  @IsOptional()
  @IsBoolean()
  videoExtension?: boolean;

  @IsOptional()
  @IsInt()
  @Min(120)
  @Max(200)
  queryFaceThreshold?: number;
}
