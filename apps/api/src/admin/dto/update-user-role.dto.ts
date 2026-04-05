import { IsIn, IsNotEmpty } from 'class-validator';

export class UpdateUserRoleDto {
  @IsNotEmpty()
  @IsIn(['USER', 'ADMIN', 'SUPER_ADMIN'])
  role!: 'USER' | 'ADMIN' | 'SUPER_ADMIN';
}
