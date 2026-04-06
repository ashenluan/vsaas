import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateSystemCapabilitiesDto {
  @IsOptional()
  @IsBoolean()
  mixcutGlobalSpeechEnabled?: boolean;
}
