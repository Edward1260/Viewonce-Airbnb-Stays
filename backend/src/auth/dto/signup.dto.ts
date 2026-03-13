import { IsEmail, IsNotEmpty, IsString, IsOptional, IsPhoneNumber, IsIn } from 'class-validator';

export class SignupDto {
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsString()
  @IsNotEmpty()
  password: string;

  @IsString()
  @IsNotEmpty()
  firstName: string;

  @IsString()
  @IsNotEmpty()
  lastName: string;

  @IsOptional()
  phone?: string;

  @IsOptional()
  @IsIn(['customer', 'host', 'admin', 'support'])
  role?: string;
}
