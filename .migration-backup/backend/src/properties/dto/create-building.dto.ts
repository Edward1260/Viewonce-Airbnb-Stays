import { IsString, IsOptional, IsNumber, IsArray, IsEnum, IsUUID, ValidateNested, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateUnitDto } from './create-unit.dto';

export enum BuildingStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  ARCHIVED = 'archived',
}

export class CreateBuildingDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  address: string;

  @IsString()
  city: string;

  @IsString()
  country: string = 'Kenya';

  @IsNumber()
  latitude: number;

  @IsNumber()
  longitude: number;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(BuildingStatus)
  status: BuildingStatus = BuildingStatus.PENDING;

  @IsString()
  @IsOptional()
  hostId?: string;

  @IsArray()
  @IsOptional()
  images?: string[];
}
