import { IsEmail, IsOptional, IsString, IsPhoneNumber, Length, IsIn, IsNumber, IsUUID } from 'class-validator';

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
  @IsNumber()
  expiresInHours?: number; // Default 24 hours

  @IsOptional()
  @IsIn(['host', 'admin', 'support'])
  role?: 'host' | 'admin' | 'support'; // Role for the invitation

  @IsOptional()
  @IsUUID()
  assignedAdminId?: string; // Admin ID to assign this host to (for host invitations)
}
