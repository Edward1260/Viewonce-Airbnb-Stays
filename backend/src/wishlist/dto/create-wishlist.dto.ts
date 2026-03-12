import { IsString, IsNotEmpty, IsUUID } from 'class-validator';

export class CreateWishlistDto {
  @IsString()
  @IsNotEmpty()
  @IsUUID()
  propertyId: string;
}
