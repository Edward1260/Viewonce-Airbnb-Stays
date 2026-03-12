import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CacheModule } from '@nestjs/cache-manager';
import { ServeStaticModule } from '@nestjs/serve-static';
import { ThrottlerModule } from '@nestjs/throttler';
import { join } from 'path';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HealthController } from './health/health.controller';
import { AuthModule } from './auth/auth.module.fixed';
import { UsersModule } from './users/users.module';
import { PropertiesModule } from './properties/properties.module';
import { BookingsModule } from './bookings/bookings.module';
import { ReviewsModule } from './reviews/reviews.module';
import { UploadModule } from './upload/upload.module';
import { TermsAcceptanceModule } from './terms-acceptance/terms-acceptance.module';
import { NotificationsModule } from './notifications/notifications.module';
import { PayoutsModule } from './payouts/payouts.module';
import { PaymentsModule } from './payments/payments.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { HostOnboardingModule } from './host-onboarding/host-onboarding.module';
import { MonitoringModule } from './monitoring/monitoring.module';
import { LiveToursModule } from './live-tours/live-tours.module';
import { RealtimeModule } from './realtime/realtime.module';
import { AiModule } from './ai/ai.module';
import { ChatModule } from './chat/chat.module';
import { WishlistModule } from './wishlist/wishlist.module';
import { AppCacheModule as CustomCacheModule } from './common/cache.module';
import { databaseConfig } from './config/database.config';
import { redisConfig } from './config/redis.config';
import * as redisStore from 'cache-manager-ioredis';

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
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 1000,   // 1 second
        limit: 10,   // 10 requests per second
      },
      {
        name: 'medium',
        ttl: 10000,  // 10 seconds
        limit: 50,   // 50 requests per 10 seconds
      },
      {
        name: 'long',
        ttl: 60000,  // 1 minute
        limit: 200,  // 200 requests per minute
      },
    ]),
    CacheModule.registerAsync({
      useFactory: redisConfig,
      inject: [ConfigService],
    }),
    // Custom cache module for CacheService
    CustomCacheModule,
    AuthModule,
    UsersModule,
    PropertiesModule,
    BookingsModule,
    ReviewsModule,
    UploadModule,
    TermsAcceptanceModule,
    NotificationsModule,
    PayoutsModule,
    PaymentsModule,
    AnalyticsModule,
    HostOnboardingModule,
    MonitoringModule,
    LiveToursModule,
    RealtimeModule,
    AiModule,
    ChatModule,
    WishlistModule,
  ],
})
export class AppModule {}
