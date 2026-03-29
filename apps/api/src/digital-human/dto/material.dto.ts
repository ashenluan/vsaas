import { IsString, IsOptional, IsInt, IsEnum, MinLength } from 'class-validator';

enum MaterialTypeEnum {
  IMAGE = 'IMAGE',
  VIDEO = 'VIDEO',
  AUDIO = 'AUDIO',
  BACKGROUND = 'BACKGROUND',
  STICKER = 'STICKER',
  AVATAR = 'AVATAR',
}

export class CreateMaterialDto {
  @IsString()
  @MinLength(1, { message: '请输入素材名称' })
  name!: string;

  @IsEnum(MaterialTypeEnum, { message: '素材类型无效，可选值: IMAGE, VIDEO, AUDIO, BACKGROUND, STICKER, AVATAR' })
  type!: string;

  @IsString()
  @MinLength(1, { message: '请提供素材 URL' })
  url!: string;

  @IsOptional()
  @IsString()
  thumbnailUrl?: string;

  @IsOptional()
  @IsInt()
  size?: number;

  @IsOptional()
  @IsString()
  mimeType?: string;
}

export class DetectFaceDto {
  @IsString()
  @MinLength(1, { message: '请提供图片 URL' })
  imageUrl!: string;

  @IsOptional()
  @IsString()
  materialId?: string;
}
