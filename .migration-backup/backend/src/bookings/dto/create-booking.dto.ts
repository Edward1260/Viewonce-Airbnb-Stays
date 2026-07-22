import { IsString, IsDateString, IsNumber, IsOptional, Min, IsEnum } from 'class-validator';
import { PaymentStatus } from '../../entities/booking.entity';

export class CreateBookingDto {
  @IsString()
  propertyId: string;

  @IsDateString()
  checkInDate: string;

  @IsDateString()
  checkOutDate: string;

  @IsNumber()
  @Min(1)
  numberOfGuests: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  totalPrice?: number;

  @IsOptional()
  @IsString()
  specialRequests?: string;

  @IsOptional()
  @IsEnum(PaymentStatus)
  paymentStatus?: PaymentStatus;
}
