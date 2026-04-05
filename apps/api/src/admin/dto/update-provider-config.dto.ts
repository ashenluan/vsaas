import { IsBoolean, IsObject, IsOptional } from 'class-validator';

export class UpdateProviderConfigDto {
  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;

  @IsOptional()
  @IsObject()
  config?: Record<string, any>;
}
