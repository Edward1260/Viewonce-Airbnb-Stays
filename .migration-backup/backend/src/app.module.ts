import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { TerminusModule } from '@nestjs/terminus';
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
import { SupportModule } from './support/support.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: {}, // Add Joi schema later
      validationOptions: {
        abortEarly: true,
      },
    }),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      async useFactory(config: ConfigService) {
        return {
          ttl: config.get<number>('THROTTLE_TTL') || 60,
          limit: config.get<number>('THROTTLE_LIMIT') || 10,
        };
      },
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const isProduction = configService.get('NODE_ENV') === 'production';
        const dbUrl = configService.get<string>('DATABASE_URL');
        
        // Use PostgreSQL if DATABASE_URL is provided (e.g. Render) or DB_TYPE is postgres
        if (dbUrl || configService.get('DB_TYPE') === 'postgres') {
          return {
            type: 'postgres',
            url: dbUrl,
            host: configService.get<string>('DB_HOST'),
            port: configService.get<number>('DB_PORT'),
            username: configService.get<string>('DB_USERNAME'),
            password: configService.get<string>('DB_PASSWORD'),
            database: configService.get<string>('DB_DATABASE'),
            entities: [__dirname + '/entities/*.entity{.ts,.js}'],
            synchronize: configService.get<string>('DB_SYNC') === 'true', // Default false in prod
            ssl: isProduction ? { rejectUnauthorized: false } : false,
            autoLoadEntities: true,
          };
        }

        // Default to SQLite for development
        return {
          type: 'sqlite',
          database: 'db.sqlite',
          entities: [__dirname + '/entities/*.entity{.ts,.js}'],
          synchronize: true,
          logging: ['error', 'warn'],
        };
      },
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
    SupportModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
