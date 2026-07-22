import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MonitoringController } from './monitoring.controller';
import { MonitoringService } from './monitoring.service';
import { MetricsService } from './metrics.service';
import { AuditLogService } from './audit-log.service';
import { MonitoringGateway } from './websocket.gateway';
import { AuditLog } from '../entities/audit-log.entity';
import { User } from '../entities/user.entity';
import { Property } from '../entities/property.entity';
import { Booking } from '../entities/booking.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([AuditLog, User, Property, Booking]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET') || 'default-jwt-secret-for-development',
        signOptions: { expiresIn: '24h' },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [MonitoringController],
  providers: [MonitoringService, MetricsService, AuditLogService, MonitoringGateway],
  exports: [MonitoringService, MetricsService, AuditLogService, MonitoringGateway],
})
export class MonitoringModule {}
