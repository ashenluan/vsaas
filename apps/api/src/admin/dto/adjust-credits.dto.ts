import { IsString, IsNotEmpty, IsNumber } from 'class-validator';

export class AdjustCreditsDto {
  @IsString()
  @IsNotEmpty()
  userId!: string;

  @IsNumber()
  amount!: number;

  @IsString()
  @IsNotEmpty()
  description!: string;
}
