import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ImageClassificationService } from './image-classification.service';
import { PropertiesService } from './properties.service';
import { PropertiesController } from './properties.controller';
import { HostInvitationService } from './host-invitation.service';
import { HostInvitationController, PublicHostInvitationController } from './host-invitation.controller';
import { Property } from '../entities/property.entity';
import { User } from '../entities/user.entity';
import { HostInvitation } from '../entities/host-invitation.entity';
import { Building } from '../entities/building.entity';
import { Unit } from '../entities/unit.entity';
import { UnitAvailability } from '../entities/unit-availability.entity';
import { BuildingsService } from './buildings.service';
import { BuildingsController } from './buildings.controller';
import { NotificationsModule } from '../notifications/notifications.module';
import { PropertyOwnershipPipe } from './property-ownership.pipe';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Property, 
      User, 
      HostInvitation, 
      Building, 
      Unit, 
      UnitAvailability
    ]),
    NotificationsModule,
  ],
  providers: [
    PropertiesService, 
    HostInvitationService, 
    ImageClassificationService, 
    BuildingsService, 
    PropertyOwnershipPipe
  ],
  controllers: [
    PropertiesController, 
    HostInvitationController, 
    PublicHostInvitationController, 
    BuildingsController
  ],
  exports: [PropertiesService, HostInvitationService, BuildingsService, PropertyOwnershipPipe],
})
export class PropertiesModule {}
