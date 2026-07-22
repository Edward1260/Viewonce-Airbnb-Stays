import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Request, BadRequestException } from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../entities/user.entity';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';

@Controller('bookings')
@UseGuards(JwtAuthGuard, RolesGuard)
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Get()
  @Roles(UserRole.CUSTOMER, UserRole.HOST, UserRole.ADMIN)
  async findAll(@Request() req, @Query() filters: any) {
    return this.bookingsService.findAll(req.user.id, filters);
  }

  @Get(':id')
  @Roles(UserRole.CUSTOMER, UserRole.HOST, UserRole.ADMIN)
  async findOne(@Param('id') id: string) {
    return this.bookingsService.findOne(id);
  }

  @Post()
  @Roles(UserRole.CUSTOMER)
  async create(@Body() createBookingDto: CreateBookingDto, @Request() req) {
    // Convert DTO to entity format
    const bookingData = {
      propertyId: createBookingDto.propertyId,
      checkIn: new Date(createBookingDto.checkInDate),
      checkOut: new Date(createBookingDto.checkOutDate),
      guests: createBookingDto.numberOfGuests,
      totalPrice: createBookingDto.totalPrice,
      specialRequests: createBookingDto.specialRequests,
      paymentStatus: createBookingDto.paymentStatus || 'pending'
    };
    return this.bookingsService.create(bookingData, req.user.id);
  }

  @Put(':id/cancel')
  @Roles(UserRole.CUSTOMER)
  async cancel(@Param('id') id: string, @Request() req) {
    return this.bookingsService.cancel(id, req.user.id);
  }

  @Put(':id/confirm')
  @Roles(UserRole.HOST, UserRole.ADMIN)
  async confirm(@Param('id') id: string) {
    return this.bookingsService.confirm(id);
  }

  @Put(':id/reject')
  @Roles(UserRole.HOST, UserRole.ADMIN)
  async reject(@Param('id') id: string) {
    return this.bookingsService.reject(id);
  }

  @Put(':id/pay')
  @Roles(UserRole.CUSTOMER)
  async pay(@Param('id') id: string, @Request() req) {
    const booking = await this.bookingsService.findOne(id);
    if (booking.userId !== req.user.id) {
      throw new BadRequestException('You can only pay for your own bookings');
    }
    if (booking.paymentStatus !== 'pending') {
      throw new BadRequestException('This booking is not pending payment');
    }
    return this.bookingsService.update(id, { paymentStatus: 'paid', status: 'confirmed' });
  }

  @Put(':id')
  @Roles(UserRole.ADMIN)
  async update(@Param('id') id: string, @Body() updateBookingDto: UpdateBookingDto) {
    return this.bookingsService.update(id, updateBookingDto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  async remove(@Param('id') id: string) {
    return this.bookingsService.remove(id);
  }
}
