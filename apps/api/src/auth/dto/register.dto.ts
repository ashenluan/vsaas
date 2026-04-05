import {
  IsEmail,
  IsString,
  MinLength,
  MaxLength,
} from 'class-validator';

export class RegisterDto {
  @IsEmail({}, { message: '邮箱格式不正确' })
  email!: string;

  @IsString()
  @MinLength(6, { message: '密码至少6位' })
  @MaxLength(100)
  password!: string;

  @IsString()
  @MinLength(1, { message: '请输入显示名称' })
  @MaxLength(50)
  displayName!: string;
}
