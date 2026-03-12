import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification, NotificationType } from '../entities/notification.entity';
import { User } from '../entities/user.entity';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private notificationRepository: Repository<Notification>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async create(userId: string, title: string, message: string, type: NotificationType, metadata?: any): Promise<Notification> {
    const notification = this.notificationRepository.create({
      userId,
      title,
      message,
      type,
      metadata,
    });
    return this.notificationRepository.save(notification);
  }

  async findByUser(userId: string): Promise<Notification[]> {
    return this.notificationRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  async markAsRead(id: string): Promise<Notification> {
    await this.notificationRepository.update(id, { isRead: true });
    const notification = await this.notificationRepository.findOne({ where: { id } });
    if (!notification) {
      throw new Error('Notification not found');
    }
    return notification;
  }

  async sendPayoutNotification(hostId: string, payoutId: string, status: string): Promise<void> {
    const host = await this.userRepository.findOne({ where: { id: hostId } });
    if (!host) return;

    let title: string;
    let message: string;
    let type: NotificationType;

    switch (status) {
      case 'pending':
        title = 'Payout Pending Approval';
        message = `Your payout for booking ${payoutId} is pending admin approval.`;
        type = NotificationType.PAYOUT_PENDING;
        break;
      case 'completed':
        title = 'Payout Completed';
        message = `Your payout for booking ${payoutId} has been processed successfully.`;
        type = NotificationType.PAYOUT_COMPLETED;
        break;
      case 'failed':
        title = 'Payout Failed';
        message = `Your payout for booking ${payoutId} could not be processed. Please contact support.`;
        type = NotificationType.PAYOUT_FAILED;
        break;
      default:
        return;
    }

    await this.create(hostId, title, message, type, { payoutId });
  }

  async sendRefundNotification(userId: string, bookingId: string): Promise<void> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) return;

    const title = 'Refund Processed';
    const message = `Your refund for booking ${bookingId} has been processed and will be credited to your original payment method.`;
    await this.create(userId, title, message, NotificationType.REFUND_PROCESSED, { bookingId });
  }

  async sendPropertyCreatedNotification(propertyId: string, hostName: string, propertyTitle: string): Promise<void> {
    // Send notification to all admins
    const admins = await this.userRepository.find({ where: { role: 'admin' } });
    for (const admin of admins) {
      const title = 'New Property Created';
      const message = `Host ${hostName} has created a new property: "${propertyTitle}". Please review and approve.`;
      await this.create(admin.id, title, message, NotificationType.PROPERTY_CREATED, { propertyId });
    }
  }

  async sendHostSignupNotification(hostId: string, hostName: string, hostEmail: string): Promise<void> {
    // Send notification to all admins
    const admins = await this.userRepository.find({ where: { role: 'admin' } });
    for (const admin of admins) {
      const title = 'New Host Signup';
      const message = `A new host has signed up: ${hostName} (${hostEmail}). Please verify their account.`;
      await this.create(admin.id, title, message, NotificationType.HOST_SIGNUP, { hostId });
    }
  }
}
