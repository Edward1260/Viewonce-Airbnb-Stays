import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CacheModule } from '@nestjs/cache-manager';
import { PropertiesService } from './properties.service';
import { PropertiesController } from './properties.controller';
import { HostInvitationService } from './host-invitation.service';
import { HostInvitationController, PublicHostInvitationController } from './host-invitation.controller';
import { Property } from '../entities/property.entity';
import { User } from '../entities/user.entity';
import { HostInvitation } from '../entities/host-invitation.entity';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Property, User, HostInvitation]),
    NotificationsModule,
    CacheModule.register()
  ],
  providers: [PropertiesService, HostInvitationService],
  controllers: [PropertiesController, HostInvitationController, PublicHostInvitationController],
  exports: [PropertiesService, HostInvitationService],
})
export class PropertiesModule {}
