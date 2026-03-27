import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { Payment } from '../entities/payment.entity';
import { Refund } from '../entities/refund.entity';
import { Booking } from '../entities/booking.entity';
import { User } from '../entities/user.entity';
import { Property } from '../entities/property.entity';
import { Payout } from '../entities/payout.entity';
import { AuditLog } from '../entities/audit-log.entity';
import { BullMQModule } from '@nestjs/bullmq';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    HttpModule,
    BullMQModule.forFeature({ name: 'webhooks' }), // Register the queue for this module
    TypeOrmModule.forFeature([Payment, Refund, Booking, User, Property, Payout, AuditLog]),
    NotificationsModule,
  ],
  providers: [PaymentsService],
  controllers: [PaymentsController],
  exports: [PaymentsService],
})
export class PaymentsModule {}
