import { IsString, IsNumber, IsOptional, IsArray, Min, Max, IsUrl } from 'class-validator';

export class CreatePropertyDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  location: string;

  @IsNumber()
  @Min(0)
  price: number;

  @IsString()
  type: string;

  @IsNumber()
  @Min(1)
  bedrooms: number;

  @IsNumber()
  @Min(1)
  bathrooms: number;

  @IsNumber()
  @Min(1)
  maxGuests: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  amenities?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  videos?: string[];
}
