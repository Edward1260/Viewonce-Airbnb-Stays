import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Booking } from '../entities/booking.entity';
import { Property } from '../entities/property.entity';
import { User } from '../entities/user.entity';
import { NotificationType } from '../entities/notification.entity';
import { PayoutsService } from '../payouts/payouts.service';
import { NotificationsService } from '../notifications/notifications.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';

@Injectable()
export class BookingsService {
  constructor(
    @InjectRepository(Booking)
    private bookingRepository: Repository<Booking>,
    @InjectRepository(Property)
    private propertyRepository: Repository<Property>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectDataSource()
    private dataSource: DataSource,
    private payoutsService: PayoutsService,
    private notificationsService: NotificationsService,
    private realtimeGateway: RealtimeGateway,
  ) {}

  async findAll(userId?: string, filters?: any): Promise<Booking[]> {
    const query = this.bookingRepository.createQueryBuilder('booking')
      .leftJoinAndSelect('booking.user', 'user')
      .leftJoinAndSelect('booking.property', 'property')
      .leftJoinAndSelect('property.host', 'host');

    if (userId) {
      query.andWhere('(booking.userId = :userId OR property.hostId = :userId)', { userId });
    }

    if (filters?.status) {
      query.andWhere('booking.status = :status', { status: filters.status });
    }

    if (filters?.propertyId) {
      query.andWhere('booking.propertyId = :propertyId', { propertyId: filters.propertyId });
    }

    return query.orderBy('booking.createdAt', 'DESC').getMany();
  }

  async findOne(id: string): Promise<Booking> {
    const booking = await this.bookingRepository.findOne({
      where: { id },
      relations: ['user', 'property', 'property.host']
    });
    if (!booking) {
      throw new NotFoundException('Booking not found');
    }
    return booking;
  }

  async create(bookingData: Partial<Booking>, customerId: string): Promise<Booking> {
    // Validate property exists and is available
    const property = await this.propertyRepository.findOne({
      where: { id: bookingData.propertyId }
    });
    if (!property) {
      throw new NotFoundException('Property not found');
    }

    // Check for booking conflicts
    const conflictingBooking = await this.bookingRepository
      .createQueryBuilder('booking')
      .where('booking.propertyId = :propertyId', { propertyId: bookingData.propertyId })
      .andWhere('booking.status IN (:...statuses)', { statuses: ['confirmed', 'pending'] })
      .andWhere(
        '(booking.checkIn <= :checkOut AND booking.checkOut >= :checkIn)',
        {
          checkIn: bookingData.checkIn,
          checkOut: bookingData.checkOut
        }
      )
      .getOne();

    if (conflictingBooking) {
      throw new BadRequestException('Property is not available for the selected dates');
    }

    // Calculate total price if not provided
    if (!bookingData.totalPrice && bookingData.checkIn && bookingData.checkOut) {
      const checkIn = bookingData.checkIn;
      const checkOut = bookingData.checkOut;
      const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
      bookingData.totalPrice = property.price * nights;
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const booking = queryRunner.manager.create(Booking, {
        ...bookingData,
        userId: customerId,
        status: 'pending'
      });

      const savedBooking = await queryRunner.manager.save(Booking, booking);

      // Get user for notification
      const user = await queryRunner.manager.findOne(User, { where: { id: customerId } });

      // Create notification within transaction
      await this.notificationsService.create(property.hostId, 'New Booking', `You have a new booking for ${property.title} from ${user.firstName} ${user.lastName}`, NotificationType.BOOKING_REQUEST);

      await queryRunner.commitTransaction();

      // Emit real-time event after transaction commit
      this.realtimeGateway.sendBookingUpdateToUser(property.hostId, { type: 'new', booking: savedBooking });

      return savedBooking;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async update(id: string, bookingData: Partial<Booking>): Promise<Booking> {
    await this.bookingRepository.update(id, bookingData);
    return this.findOne(id);
  }

  async cancel(id: string, userId: string): Promise<Booking> {
    const booking = await this.findOne(id);

    // Check if user can cancel this booking
    if (booking.userId !== userId) {
      throw new BadRequestException('You can only cancel your own bookings');
    }

    // Only allow cancellation of pending or confirmed bookings
    if (!['pending', 'confirmed'].includes(booking.status)) {
      throw new BadRequestException('This booking cannot be cancelled');
    }

    // Notify host about cancellation
    await this.notificationsService.create(booking.property.hostId, 'Booking Cancelled', `Guest cancelled booking for ${booking.property.title}.`, NotificationType.BOOKING_CANCELLED);

    // Emit real-time event to host
    this.realtimeGateway.sendBookingUpdateToUser(booking.property.hostId, { type: 'cancelled', booking: booking });

    // If confirmed and paid, hold funds for admin refund
    if (booking.status === 'confirmed' && booking.paymentStatus === 'paid') {
      await this.update(id, { status: 'cancelled', paymentStatus: 'escrow_held' });
      // Notify admin about refund needed
      await this.notificationsService.create('admin-user-id', 'Refund Required', `Guest cancelled booking ${id}, funds held for refund.`, NotificationType.SYSTEM_MESSAGE);
    } else {
      await this.update(id, { status: 'cancelled' });
    }

    return this.findOne(id);
  }

  async confirm(id: string): Promise<Booking> {
    const booking = await this.findOne(id);
    await this.notificationsService.create(booking.userId, 'Booking Confirmed', `Your booking for ${booking.property.title} has been confirmed!`, NotificationType.BOOKING_CONFIRMED);
    return this.update(id, { status: 'confirmed' });
  }

  async complete(id: string): Promise<Booking> {
    const booking = await this.findOne(id);
    if (booking.status !== 'confirmed') {
      throw new BadRequestException('Only confirmed bookings can be completed');
    }

    // Create payout
    await this.payoutsService.createPayout(id);

    return this.update(id, { status: 'completed' });
  }

  async reject(id: string): Promise<Booking> {
    const booking = await this.findOne(id);
    await this.notificationsService.create(booking.userId, 'Booking Rejected', `Your booking for ${booking.property.title} has been rejected.`, NotificationType.BOOKING_REJECTED);
    return this.update(id, { status: 'rejected' });
  }

  async remove(id: string): Promise<void> {
    const result = await this.bookingRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException('Booking not found');
    }
  }
}


