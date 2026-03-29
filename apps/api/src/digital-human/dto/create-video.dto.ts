import {
  IsString,
  IsOptional,
  IsEnum,
  ValidateIf,
  IsNotEmpty,
} from 'class-validator';

export enum DriveMode {
  TEXT = 'text',
  AUDIO = 'audio',
}

export class CreateVideoDto {
  @IsString()
  avatarId!: string;

  @IsEnum(DriveMode)
  driveMode!: DriveMode;

  @IsString()
  resolution!: string;

  @IsOptional()
  @IsString()
  name?: string;

  // Text drive fields
  @ValidateIf((o) => o.driveMode === DriveMode.TEXT)
  @IsString()
  @IsNotEmpty({ message: '请选择声音' })
  voiceId?: string;

  @ValidateIf((o) => o.driveMode === DriveMode.TEXT)
  @IsString()
  @IsNotEmpty({ message: '请输入台词文案' })
  text?: string;

  // Audio drive fields
  @ValidateIf((o) => o.driveMode === DriveMode.AUDIO)
  @IsString()
  @IsNotEmpty({ message: '请上传音频文件' })
  audioUrl?: string;
}
