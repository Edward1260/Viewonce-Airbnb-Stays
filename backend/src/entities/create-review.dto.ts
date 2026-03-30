import { IsUUID, IsInt, Min, Max, IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateReviewDto {
  @IsUUID()
  @IsNotEmpty()
  propertyId: string;

  @IsInt()
  @Min(1)
  @Max(5)
  @IsNotEmpty()
  rating: number;

  @IsString()
  @IsNotEmpty()
  text: string;
}