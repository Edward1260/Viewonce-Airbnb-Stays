import { IsString, IsNotEmpty, IsNumber, Min, IsOptional, Matches } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateMpesaStkDto {
  @IsString()
  @IsNotEmpty()
  bookingId: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^(\+?254|0)?7\d{8}$/, {
    message: 'Phone must be valid Kenyan number (e.g. 0712345678, +254712345678, 254712345678)'
  })
  @Transform(({ value }) => {
    // Format to international: 2547xxxxxxxx
    let phone = value.toString().replace(/[^\d]/g, '');
    if (phone.startsWith('0')) phone = '254' + phone.slice(1);
    if (phone.startsWith('7')) phone = '2547' + phone.slice(1);
    if (phone.startsWith('254') && !phone.startsWith('2547')) return null; // invalid
    if (!phone.startsWith('2547') || phone.length !== 12) return null;
    return phone;
  })
  phoneNumber: string;

  @IsNumber()
  @Min(10)
  amount: number;
}
