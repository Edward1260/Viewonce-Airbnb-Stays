import { 
  IsString, 
  IsOptional, 
  IsNumber, 
  IsInt, 
  Min, 
  IsArray, 
  IsEnum,
  IsUUID 
} from 'class-validator';

export enum UnitStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

export class CreateUnitDto {
  @IsString()
  unitNumber: string;

  @IsUUID()
  buildingId: string;

  @IsEnum(UnitStatus)
  @IsOptional()
  status?: UnitStatus = UnitStatus.PENDING;

  @IsInt()
  @Min(0)
  floor: number;

  @IsNumber()
  @Min(0)
  pricePerNight: number;

  @IsInt()
  @Min(1)
  maxOccupancy: number;

  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  amenities?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];
}
