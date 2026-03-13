import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Payout, PayoutStatus } from '../entities/payout.entity';
import { Booking } from '../entities/booking.entity';
import { User } from '../entities/user.entity';
import { Payment, TransactionType, TransactionStatus } from '../entities/payment.entity';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class PayoutsService {
  private readonly COMMISSION_RATE = 0.10; // 10%

  constructor(
    @InjectRepository(Payout)
    private payoutRepository: Repository<Payout>,
    @InjectRepository(Booking)
    private bookingRepository: Repository<Booking>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Payment)
    private paymentRepository: Repository<Payment>,
    private notificationsService: NotificationsService,
  ) {}

  async createPayout(bookingId: string): Promise<Payout> {
    const booking = await this.bookingRepository.findOne({
      where: { id: bookingId },
      relations: ['property', 'property.host']
    });
    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    if (booking.status !== 'completed') {
      throw new BadRequestException('Booking must be completed to create payout');
    }

    if (booking.paymentStatus !== 'paid') {
      throw new BadRequestException('Booking must be paid to create payout');
    }

    // Check if payout already exists
    const existingPayout = await this.payoutRepository.findOne({ where: { bookingId } });
    if (existingPayout) {
      throw new BadRequestException('Payout already exists for this booking');
    }

    const host = booking.property.host;
    const amount = booking.totalPrice;
    const commission = amount * this.COMMISSION_RATE;
    const netAmount = amount - commission;

    // Determine if automatic or manual
    const isNewHost = await this.isNewHost(host.id);
    const status = isNewHost ? PayoutStatus.PENDING : PayoutStatus.APPROVED;

    const payout = this.payoutRepository.create({
      bookingId,
      hostId: host.id,
      amount,
      commission,
      netAmount,
      status,
    });

    const savedPayout = await this.payoutRepository.save(payout);

    // If automatic, complete immediately
    if (!isNewHost) {
      await this.completePayout(savedPayout.id);
    } else {
      await this.notificationsService.sendPayoutNotification(host.id, savedPayout.id, 'pending');
    }

    return savedPayout;
  }

  async approvePayout(id: string): Promise<Payout> {
    const payout = await this.payoutRepository.findOne({ where: { id } });
    if (!payout) {
      throw new NotFoundException('Payout not found');
    }

    if (payout.status !== PayoutStatus.PENDING) {
      throw new BadRequestException('Payout is not pending');
    }

    payout.status = PayoutStatus.APPROVED;
    const updatedPayout = await this.payoutRepository.save(payout);

    await this.notificationsService.sendPayoutNotification(payout.hostId, payout.id, 'approved');
    return updatedPayout;
  }

  async completePayout(id: string): Promise<Payout> {
    const payout = await this.payoutRepository.findOne({
      where: { id },
      relations: ['host']
    });
    if (!payout) {
      throw new NotFoundException('Payout not found');
    }

    if (payout.status !== PayoutStatus.APPROVED) {
      throw new BadRequestException('Payout must be approved first');
    }

    // Update host wallet
    payout.host.walletBalance += payout.netAmount;
    await this.userRepository.save(payout.host);

    payout.status = PayoutStatus.COMPLETED;
    payout.processedAt = new Date();
    const updatedPayout = await this.payoutRepository.save(payout);

    // Log payment transaction
    await this.paymentRepository.save({
      bookingId: payout.bookingId,
      userId: payout.hostId,
      type: TransactionType.PAYOUT,
      amount: payout.netAmount,
      status: TransactionStatus.COMPLETED,
      reference: `Payout ${payout.id}`,
    });

    await this.notificationsService.sendPayoutNotification(payout.hostId, payout.id, 'completed');
    return updatedPayout;
  }

  async cancelPayout(id: string, reason?: string): Promise<Payout> {
    const payout = await this.payoutRepository.findOne({ where: { id } });
    if (!payout) {
      throw new NotFoundException('Payout not found');
    }

    if (payout.status === PayoutStatus.COMPLETED) {
      throw new BadRequestException('Cannot cancel completed payout');
    }

    payout.status = PayoutStatus.CANCELLED;
    payout.adminNotes = reason || 'Cancelled by admin';
    const updatedPayout = await this.payoutRepository.save(payout);

    await this.notificationsService.sendPayoutNotification(payout.hostId, payout.id, 'failed');
    return updatedPayout;
  }

  async disputePayout(id: string, reason: string): Promise<Payout> {
    const payout = await this.payoutRepository.findOne({ where: { id } });
    if (!payout) {
      throw new NotFoundException('Payout not found');
    }

    payout.status = PayoutStatus.DISPUTED;
    payout.adminNotes = reason;
    return this.payoutRepository.save(payout);
  }

  async findAll(filters?: { status?: string; hostId?: string }): Promise<Payout[]> {
    const query = this.payoutRepository.createQueryBuilder('payout')
      .leftJoinAndSelect('payout.booking', 'booking')
      .leftJoinAndSelect('payout.host', 'host')
      .leftJoinAndSelect('booking.property', 'property');

    if (filters?.status) {
      query.andWhere('payout.status = :status', { status: filters.status });
    }

    if (filters?.hostId) {
      query.andWhere('payout.hostId = :hostId', { hostId: filters.hostId });
    }

    return query.orderBy('payout.createdAt', 'DESC').getMany();
  }

  async findOne(id: string): Promise<Payout> {
    const payout = await this.payoutRepository.findOne({
      where: { id },
      relations: ['booking', 'host', 'booking.property']
    });
    if (!payout) {
      throw new NotFoundException('Payout not found');
    }
    return payout;
  }

  private async isNewHost(hostId: string): Promise<boolean> {
    // Consider host new if they have less than 3 completed bookings
    const completedBookings = await this.bookingRepository.count({
      where: {
        property: { hostId },
        status: 'completed'
      }
    });
    return completedBookings < 3;
  }
}
