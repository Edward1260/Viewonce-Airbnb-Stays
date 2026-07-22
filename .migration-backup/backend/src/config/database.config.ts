import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';

// Import all entities explicitly
import { User } from '../entities/user.entity';
import { Property } from '../entities/property.entity';
import { Booking } from '../entities/booking.entity';
import { Payment } from '../entities/payment.entity';
import { Payout } from '../entities/payout.entity';
import { Refund } from '../entities/refund.entity';
import { Review } from '../entities/review.entity';
import { Message } from '../entities/message.entity';
import { Notification } from '../entities/notification.entity';
import { Wishlist } from '../entities/wishlist.entity';
import { LiveTour } from '../entities/live-tour.entity';
import { HostOnboarding } from '../entities/host-onboarding.entity';
import { CancellationPolicy } from '../entities/cancellation-policy.entity';
import { TermsAcceptance } from '../entities/terms-acceptance.entity';
import { UiSettings } from '../entities/ui-settings.entity';
import { AuditLog } from '../entities/audit-log.entity';
import { HostInvitation } from '../entities/host-invitation.entity';

// Array of all entities for easy import
const entities = [
  User,
  Property,
  Booking,
  Payment,
  Payout,
  Refund,
  Review,
  Message,
  Notification,
  Wishlist,
  LiveTour,
  HostOnboarding,
  CancellationPolicy,
  TermsAcceptance,
  UiSettings,
  AuditLog,
  HostInvitation,
];

export const databaseConfig = (configService: ConfigService): TypeOrmModuleOptions => {
  const isProduction = configService.get<string>('NODE_ENV') === 'production';
  const isDevelopment = configService.get<string>('NODE_ENV') === 'development';
  const usePostgres = configService.get<string>('DB_TYPE', 'sqlite') === 'postgres';
  
  if (usePostgres) {
    // PostgreSQL configuration - for both development and production
    const sslMode = configService.get<string>('DB_SSL_MODE', 'require');
    
    // Determine SSL settings based on mode
    let sslConfig: boolean | { rejectUnauthorized: boolean } = false;
    if (sslMode !== 'disable') {
      sslConfig = { rejectUnauthorized: sslMode !== 'require' };
    }
    
    return {
      type: 'postgres',
      host: configService.get<string>('DB_HOST', 'localhost'),
      port: configService.get<number>('DB_PORT', 5432),
      username: configService.get<string>('DB_USERNAME', 'postgres'),
      password: configService.get<string>('DB_PASSWORD', ''),
      database: configService.get<string>('DB_DATABASE', 'airbnb_db'),
      entities: entities,
      migrations: [__dirname + '/../migrations/*{.ts,.js}'],
      migrationsTableName: 'migrations',
      synchronize: false, // Never sync in production - use migrations instead
      migrationsRun: isProduction, // Run migrations in production
      logging: isDevelopment ? ['error', 'warn', 'log'] : ['error'],
      
      // Connection pooling - optimized for production
      extra: {
        // Production: Higher pool size for concurrent requests
        max: isProduction ? 20 : 10,
        min: isProduction ? 5 : 2,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: isProduction ? 5000 : 2000,
        // Acquire timeout in milliseconds
        acquireTimeoutMillis: isProduction ? 10000 : 5000,
      },
      
      // SSL configuration
      ssl: isProduction ? sslConfig : (sslMode !== 'disable' ? { rejectUnauthorized: false } : false),
    };
  } else {
    // SQLite configuration for development
    const dbPath = configService.get<string>('DB_DATABASE', 'db.sqlite');
    
    return {
      type: 'sqlite',
      database: dbPath,
      entities: entities,
      migrations: [__dirname + '/../migrations/*{.ts,.js}'],
      migrationsTableName: 'migrations',
      synchronize: isDevelopment, // Only sync in development
      migrationsRun: false,
      logging: isDevelopment ? ['error', 'warn', 'log', 'info', 'query'] : ['error'],
    };
  }
};

/**
 * Get database configuration options for CLI tools (migrations, seeding, etc.)
 * This is a synchronous version that reads from process.env directly
 */
export const getDatabaseCliConfig = (): TypeOrmModuleOptions => {
  const nodeEnv = process.env.NODE_ENV || 'development';
  const isProduction = nodeEnv === 'production';
  const usePostgres = process.env.DB_TYPE === 'postgres';
  
  if (usePostgres) {
    return {
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      username: process.env.DB_USERNAME || 'postgres',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_DATABASE || 'airbnb_db',
      entities: entities,
      migrations: [__dirname + '/../migrations/*{.ts,.js}'],
      migrationsTableName: 'migrations',
      synchronize: false,
      migrationsRun: false,
      logging: !isProduction,
      ssl: isProduction ? { rejectUnauthorized: false } : false,
    };
  }
  
  return {
    type: 'sqlite',
    database: process.env.DB_DATABASE || 'db.sqlite',
    entities: entities,
    migrations: [__dirname + '/../migrations/*{.ts,.js}'],
    migrationsTableName: 'migrations',
    synchronize: false,
    migrationsRun: false,
    logging: !isProduction,
  };
};
