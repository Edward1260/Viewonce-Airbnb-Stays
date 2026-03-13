import { Injectable, ConflictException, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User, UserRole, UserStatus } from '../entities/user.entity';
import { LoginDto } from './dto/login.dto';
import { SignupDto } from './dto/signup.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private jwtService: JwtService,
  ) {}

  async signup(signupDto: SignupDto): Promise<{ user: User; token: string; refreshToken: string }> {
    const { email, password, firstName, lastName, phone, role } = signupDto;

    let finalEmail = email;
    const userRole = role || UserRole.CUSTOMER;

    // Generate email if not provided
    if (!finalEmail) {
      if (userRole === UserRole.HOST) {
        finalEmail = `${firstName.toLowerCase()}.view1s@gmail.com`;
      } else if (userRole === UserRole.ADMIN) {
        finalEmail = `${firstName.toLowerCase()}.viewad@gmail.com`;
      } else {
        throw new BadRequestException('Email is required for customers');
      }
    }

    // Check if user already exists
    const existingUser = await this.userRepository.findOne({ where: { email: finalEmail } });
    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create user
    const user = this.userRepository.create({
      email: finalEmail,
      password: hashedPassword,
      firstName,
      lastName,
      phone,
      role: userRole,
      status: UserStatus.ACTIVE,
    });

    await this.userRepository.save(user);

    // Generate tokens
    const payload = { sub: user.id, email: user.email, role: user.role };
    const token = this.jwtService.sign(payload);
    const refreshToken = this.jwtService.sign(payload, {
      expiresIn: 604800,
    });

    return { user, token, refreshToken };
  }

  async login(loginDto: LoginDto): Promise<{ user: User; token: string; refreshToken: string }> {
    const { email, password } = loginDto;

    // Find user
    const user = await this.userRepository.findOne({ where: { email } });
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if user is active
    if (user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('Account is not active');
    }

    // Update last login
    user.lastLoginAt = new Date();
    await this.userRepository.save(user);

    // Generate tokens
    const payload = { sub: user.id, email: user.email, role: user.role };
    const token = this.jwtService.sign(payload);
    const refreshToken = this.jwtService.sign(payload, {
      expiresIn: 604800,
    });

    return { user, token, refreshToken };
  }

  async refreshToken(refreshToken: string): Promise<{ token: string; refreshToken: string }> {
    try {
      // Verify the refresh token
      const payload = this.jwtService.verify(refreshToken);
      const user = await this.userRepository.findOne({
        where: { id: payload.sub },
      });

      if (!user) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      // Generate new tokens
      const newPayload = { sub: user.id, email: user.email, role: user.role };
      const token = this.jwtService.sign(newPayload);
      const newRefreshToken = this.jwtService.sign(newPayload, {
        expiresIn: 604800,
      });

      return { token, refreshToken: newRefreshToken };
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  async logout(userId: string): Promise<void> {
    // In a real implementation, you might want to blacklist the token
    // For now, just return success
    return;
  }

  // ========== STUB METHODS for advanced features (TODO: implement) ==========
  async isSetupRequired(): Promise<boolean> {
    return false; // TODO: implement
  }

  async createSuperAdmin(body: any): Promise<any> {
    throw new Error('Super admin setup not implemented');
  }

  async sendVerificationEmail(userId: string): Promise<any> {
    throw new Error('Email verification not implemented');
  }

  async verifyEmail(token: string): Promise<any> {
    throw new Error('Email verification not implemented');
  }

  async enable2FA(userId: string): Promise<any> {
    throw new Error('2FA enable not implemented');
  }

  async verifyAndActivate2FA(userId: string, code: string): Promise<any> {
    throw new Error('2FA verify not implemented');
  }

  async disable2FA(userId: string, code: string): Promise<any> {
    throw new Error('2FA disable not implemented');
  }

  async loginWith2FA(email: string, password: string, code: string): Promise<any> {
    throw new Error('2FA login not implemented');
  }

  async get2FAStatus(userId: string): Promise<any> {
    return { enabled: false }; // TODO: implement
  }
}
