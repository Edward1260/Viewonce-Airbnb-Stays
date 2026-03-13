import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CacheModule } from '@nestjs/cache-manager';
import { AuthService } from './auth.service.fixed';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './jwt.strategy';
import { MfaGuard } from './mfa.guard';
import { User } from '../entities/user.entity';
import { UsersModule } from '../users/users.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET') || 'default-jwt-secret-for-development',
        signOptions: {
          expiresIn: '24h',
        },
      }),
      inject: [ConfigService],
    }),
    UsersModule,
    NotificationsModule,
    // Import CacheModule for use in AuthService
    // This is needed because the global CacheModule from app.module.fixed.ts
    // may not be properly accessible in this context
    CacheModule.register(),
  ],
  providers: [AuthService, JwtStrategy, MfaGuard],
  controllers: [AuthController],
  exports: [AuthService, MfaGuard],
})
export class AuthModule {}
