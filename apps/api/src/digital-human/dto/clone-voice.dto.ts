import { IsString, MinLength } from 'class-validator';

export class CloneVoiceDto {
  @IsString()
  @MinLength(1, { message: '请输入声音名称' })
  name!: string;

  @IsString()
  @MinLength(1, { message: '请提供音频文件 URL' })
  sampleUrl!: string;
}
