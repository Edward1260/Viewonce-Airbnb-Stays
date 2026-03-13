import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';

// Feature modules
import { PropertiesModule } from './properties/properties.module';
import { UsersModule } from './users/users.module';
import { BookingsModule } from './bookings/bookings.module';
import { PaymentsModule } from './payments/payments.module';
import { ReviewsModule } from './reviews/reviews.module';
import { ChatModule } from './chat/chat.module';
import { NotificationsModule } from './notifications/notifications.module';
import { HostOnboardingModule } from './host-onboarding/host-onboarding.module';
import { LiveToursModule } from './live-tours/live-tours.module';
import { WishlistModule } from './wishlist/wishlist.module';
import { UploadModule } from './upload/upload.module';
import { MonitoringModule } from './monitoring/monitoring.module';
import { RealtimeModule } from './realtime/realtime.module';
import { AiModule } from './ai/ai.module';
import { TermsAcceptanceModule } from './terms-acceptance/terms-acceptance.module';
import { UiSettingsModule } from './ui-settings/ui-settings.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: () => ({
        type: 'sqlite',  // sqlite3 package (in deps)
        database: 'db.sqlite',
        entities: [__dirname + '/entities/*.entity{.ts,.js}'],
        synchronize: true,  // dev only - disable in prod!
        logging: ['error', 'warn'],
      }),
    }),
    // Core
    AuthModule,
    // Features
    PropertiesModule,
    UsersModule,
    BookingsModule,
    PaymentsModule,
    ReviewsModule,
    ChatModule,
    NotificationsModule,
    HostOnboardingModule,
    LiveToursModule,
    WishlistModule,
    UploadModule,
    MonitoringModule,
    RealtimeModule,
    AiModule,
    TermsAcceptanceModule,
    UiSettingsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
