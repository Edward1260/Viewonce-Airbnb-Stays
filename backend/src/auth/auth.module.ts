import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
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
  ],
  providers: [AuthService, JwtStrategy, MfaGuard],
  controllers: [AuthController],
  exports: [AuthService, MfaGuard],
})
export class AuthModule {}
