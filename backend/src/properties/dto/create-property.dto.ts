cimport { IsString, IsNumber, IsOptional, IsArray, Min, Max, IsUrl, IsNotEmpty, IsInt } from 'class-validator';

export class CreatePropertyDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  @IsNotEmpty()
  location: string;

  @IsNumber()
  @Min(0)
  price: number;

  @IsString()
  @IsNotEmpty()
  type: string;

  @IsInt()
  @Min(1)
  bedrooms: number;

  @IsInt()
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
