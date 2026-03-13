import { IsOptional, IsObject, IsString, IsBoolean } from 'class-validator';

export class CreateUiSettingsDto {
  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsObject()
  colors?: {
    background: string;
    card: string;
    accent: string;
    accent2: string;
    text: string;
    textSecondary: string;
    muted: string;
    border: string;
    success: string;
    error: string;
    warn: string;
    info: string;
  };

  @IsOptional()
  @IsObject()
  theme?: {
    name: string;
    isDark: boolean;
    customCss?: string;
  };

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
