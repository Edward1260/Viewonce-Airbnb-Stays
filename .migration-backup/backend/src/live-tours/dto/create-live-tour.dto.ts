import { IsString, IsOptional, IsNumber, IsUrl } from 'class-validator';

export class CreateLiveTourDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsUrl()
  videoUrl: string;

  @IsOptional()
  @IsUrl()
  thumbnailUrl?: string;

  @IsString()
  location: string;

  @IsOptional()
  @IsNumber()
  rating?: number;
}
