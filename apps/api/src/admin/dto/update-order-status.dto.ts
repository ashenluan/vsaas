import { IsIn, IsNotEmpty } from 'class-validator';

export class UpdateOrderStatusDto {
  @IsNotEmpty()
  @IsIn(['PENDING', 'PAID', 'FAILED', 'REFUNDED'])
  status!: 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';
}
