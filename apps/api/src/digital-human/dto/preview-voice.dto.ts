import { IsString, MinLength, MaxLength } from 'class-validator';

export class PreviewVoiceDto {
  @IsString()
  @MinLength(1)
  voiceId!: string;

  @IsString()
  @MinLength(1, { message: '请输入预览文本' })
  @MaxLength(500, { message: '预览文本最多500字' })
  text!: string;
}
