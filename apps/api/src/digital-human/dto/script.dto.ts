import { IsString, IsOptional, IsArray, MinLength, MaxLength } from 'class-validator';

export class CreateScriptDto {
  @IsString()
  @MinLength(1, { message: '请输入脚本标题' })
  @MaxLength(200, { message: '标题最多200字' })
  title!: string;

  @IsString()
  @MinLength(1, { message: '请输入脚本内容' })
  @MaxLength(10000, { message: '脚本内容最多10000字' })
  content!: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}

export class UpdateScriptDto {
  @IsOptional()
  @IsString()
  @MinLength(1, { message: '标题不能为空' })
  @MaxLength(200, { message: '标题最多200字' })
  title?: string;

  @IsOptional()
  @IsString()
  @MinLength(1, { message: '脚本内容不能为空' })
  @MaxLength(10000, { message: '脚本内容最多10000字' })
  content?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}
