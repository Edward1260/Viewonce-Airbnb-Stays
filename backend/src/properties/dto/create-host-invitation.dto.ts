import { IsEmail, IsOptional, IsString, IsPhoneNumber, Length, IsIn } from 'class-validator';

export class CreateHostInvitationDto {
  @IsEmail()
  email: string;

  @IsOptional()
  @IsPhoneNumber()
  phone?: string;

  @IsOptional()
  @IsString()
  @Length(0, 500)
  message?: string;

  @IsOptional()
  @IsString()
  expiresInHours?: number; // Default 24 hours

  @IsOptional()
  @IsIn(['host', 'admin', 'support'])
  role?: 'host' | 'admin' | 'support'; // Role for the invitation

  @IsOptional()
  @IsString()
  assignedAdminId?: string; // Admin ID to assign this host to (for host invitations)
}
