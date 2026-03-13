import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CacheModule } from '@nestjs/cache-manager';
import { ServeStaticModule } from '@nestjs/serve-static';
import { ThrottlerModule } from '@nestjs/throttler';
import { join } from 'path';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module.fixed';
import { UsersModule } from './users/users.module';
import { PropertiesModule } from './properties/properties.module';
import { BookingsModule } from './bookings/bookings.module';
import { ReviewsModule } from './reviews/reviews.module';
import { UploadModule } from './upload/upload.module';
import { TermsAcceptanceModule } from './terms-acceptance/terms-acceptance.module';
import { NotificationsModule } from './notifications/notifications.module';
import { PayoutsModule } from './payouts/payouts.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { HostOnboardingModule } from './host-onboarding/host-onboarding.module';
import { MonitoringModule } from './monitoring/monitoring.module';
import { LiveToursModule } from './live-tours/live-tours.module';
import { RealtimeModule } from './realtime/realtime.module';
import { AiModule } from './ai/ai.module';
import { ChatModule } from './chat/chat.module';
import { UiSettingsModule } from './ui-settings/ui-settings.module';

import { databaseConfig } from './config/database.config';
import { redisConfig } from './config/redis.config';
import * as redisStore from 'cache-manager-redis-store';

@Module({
  controllers: [AppController],
  providers: [AppService],
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      useFactory: databaseConfig,
      inject: [ConfigService],
    }),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'uploads'),
      serveRoot: '/uploads',
    }),
    ThrottlerModule.forRoot({
      throttlers: [{ ttl: 60000, limit: 10 }],
    }),
    CacheModule.registerAsync({
      useFactory: redisConfig,
      inject: [ConfigService],
    }),
    AuthModule,
    UsersModule,
    PropertiesModule,
    BookingsModule,
    ReviewsModule,
    UploadModule,
    TermsAcceptanceModule,
    NotificationsModule,
    PayoutsModule,
    AnalyticsModule,
    HostOnboardingModule,
    MonitoringModule,
    LiveToursModule,
    RealtimeModule,
    AiModule,
    ChatModule,
    UiSettingsModule,
    // SearchModule, // Temporarily disabled due to compilation errors
  ],
})
export class AppModule {}
