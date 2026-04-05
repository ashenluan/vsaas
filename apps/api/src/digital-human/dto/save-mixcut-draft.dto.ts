import { IsString, IsOptional, IsObject, IsNotEmpty } from 'class-validator';

export class SaveMixcutDraftDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsString()
  @IsNotEmpty({ message: '草稿名称不能为空' })
  name!: string;

  @IsObject()
  projectData!: any;
}
