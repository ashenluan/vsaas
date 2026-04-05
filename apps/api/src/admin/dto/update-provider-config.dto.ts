import { IsBoolean, IsObject, IsOptional, IsString } from 'class-validator';

export class UpdateProviderConfigDto {
  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;

  @IsOptional()
  @IsObject()
  config?: Record<string, any>;

  @IsOptional()
  @IsString()
  apiKey?: string;
}
