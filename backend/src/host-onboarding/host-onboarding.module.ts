import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HostOnboardingController } from './host-onboarding.controller';
import { HostOnboardingService } from './host-onboarding.service';
import { HostOnboarding } from '../entities/host-onboarding.entity';
import { User } from '../entities/user.entity';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([HostOnboarding, User]),
    NotificationsModule,
  ],
  controllers: [HostOnboardingController],
  providers: [HostOnboardingService],
  exports: [HostOnboardingService],
})
export class HostOnboardingModule {}
