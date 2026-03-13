import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { Booking } from '../entities/booking.entity';
import { User } from '../entities/user.entity';
import { Property } from '../entities/property.entity';
import { Payout } from '../entities/payout.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Booking, User, Property, Payout]),
  ],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
