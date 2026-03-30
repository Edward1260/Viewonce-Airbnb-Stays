import { Injectable, ConflictException, UnauthorizedException, BadRequestException, ForbiddenException, Inject } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User, UserRole, UserStatus } from '../entities/user.entity';
import { LoginDto } from './dto/login.dto';
import { SignupDto } from './dto/signup.dto';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { MailerService } from '@nestjs-modules/mailer';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private jwtService: JwtService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private configService: ConfigService,
    private mailerService: MailerService,
  ) {}

  private readonly MAX_VERIFY_ATTEMPTS = 5;
  private readonly LOCK_TIME_MS = 15 * 60 * 1000; // 15 minutes

  async requestOtpSignup(signupDto: SignupDto): Promise<{ otpRequired: boolean; sessionId: string }> {
    const { email, agreeTerms, role, adminSecretKey } = signupDto as any;

    if (!agreeTerms) {
      throw new BadRequestException('You must agree to the Terms & Conditions.');
    }

    // Secure Admin Signup with Secret Key
    if (role === 'admin' && adminSecretKey !== this.configService.get<string>('ADMIN_SIGNUP_KEY')) {
      throw new ForbiddenException('Invalid or missing Admin Secret Key.');
    }

    const existingUser = await this.userRepository.findOne({ where: { email } });
    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const sessionId = Math.random().toString(36).substring(2, 15);

    // Store data in Redis for 10 minutes (600,000 ms)
    await this.cacheManager.set(`signup_otp:${sessionId}`, { otp, data: signupDto }, 600000);

    // Send OTP via Email
    await this.mailerService.sendMail({
      to: email,
      subject: 'Verify Your Account - ViewOnce Stays',
      html: `
        <h3>Welcome to ViewOnce Stays</h3>
        <p>Hi ${signupDto.firstName},</p>
        <p>Your verification code is: <strong>${otp}</strong></p>
        <p>This code will expire in 10 minutes.</p>
      `,
    });

    return { otpRequired: true, sessionId };
  }

  async verifyOtpSignup(email: string, otp: string, sessionId: string) {
    const attemptKey = `verify_attempts:${email}`;
    const sessionKey = `signup_otp:${sessionId}`;

    let attempts: any = await this.cacheManager.get(attemptKey) || { count: 0, blockedUntil: 0 };

    // 1. Check if user is currently blocked
    if (Date.now() < attempts.blockedUntil) {
      const waitTime = Math.ceil((attempts.blockedUntil - Date.now()) / 60000);
      throw new ForbiddenException(`Too many failed attempts. Try again in ${waitTime} minutes.`);
    }

    const session: any = await this.cacheManager.get(sessionKey);

    // 2. Validate session and expiration
    if (!session || session.data.email !== email) {
      throw new BadRequestException('Session expired or invalid. Please restart signup.');
    }

    // 3. Verify OTP
    if (session.otp !== otp) {
      attempts.count++;
      
      if (attempts.count >= this.MAX_VERIFY_ATTEMPTS) {
        attempts.blockedUntil = Date.now() + this.LOCK_TIME_MS;
        await this.cacheManager.set(attemptKey, attempts, this.LOCK_TIME_MS);
        throw new ForbiddenException('Too many failed attempts. Account registration locked for 15 minutes.');
      }

      await this.cacheManager.set(attemptKey, attempts, this.LOCK_TIME_MS);
      const remaining = this.MAX_VERIFY_ATTEMPTS - attempts.count;
      throw new UnauthorizedException(`Invalid OTP. ${remaining} attempts remaining.`);
    }

    // 4. Success: Create user
    await this.cacheManager.del(attemptKey);
    await this.cacheManager.del(sessionKey);
    
    return this.finalizeSignup(session.data);
  }

  private async finalizeSignup(signupDto: SignupDto) {
    const { email, password, firstName, lastName, phone, role } = signupDto;
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = this.userRepository.create({
      email,
      password: hashedPassword,
      firstName,
      lastName,
      phone,
      role: role || UserRole.CUSTOMER,
      status: UserStatus.ACTIVE,
      isEmailVerified: true,
    });

    const savedUser = await this.userRepository.save(user);
    const payload = { sub: savedUser.id, email: savedUser.email, role: savedUser.role };
    
    return {
      user: savedUser,
      token: this.jwtService.sign(payload),
      refreshToken: this.jwtService.sign(payload, { expiresIn: '7d' }),
    };
  }

  async signup(signupDto: SignupDto): Promise<{ user: User; token: string; refreshToken: string }> {
    const { email, password, firstName, lastName, phone, role, agreeTerms } = signupDto;

    if (!agreeTerms) {
      throw new BadRequestException('You must agree to the Terms & Conditions.');
    }

    let finalEmail = email;
    const userRole = (role as UserRole) || UserRole.CUSTOMER;

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

  async isSetupRequired(): Promise<{ required: boolean; message: string }> {
    const superAdmin = await this.userRepository.findOne({ 
      where: { role: UserRole.PLATFORM_MASTER_HUB } 
    });
    
    return {
      required: !superAdmin,
      message: superAdmin ? 'Setup complete. Login instead.' : 'No super admin found. Setup required.'
    };
  }

  async createSuperAdmin(body: any): Promise<any> {
    const { required } = await this.isSetupRequired();
    if (!required) {
      throw new ForbiddenException('Super Admin already exists. Setup is disabled.');
    }

    const hashedPassword = await bcrypt.hash(body.password, 10);
    const user = this.userRepository.create({
      ...body,
      password: hashedPassword,
      role: UserRole.PLATFORM_MASTER_HUB,
      status: UserStatus.ACTIVE,
      isEmailVerified: true // Auto-verify the first super admin
    });

    await this.userRepository.save(user);

    const payload = { sub: user.id, email: user.email, role: user.role };
    return {
      message: 'Platform Master Hub created successfully',
      user,
      token: this.jwtService.sign(payload),
      refreshToken: this.jwtService.sign(payload, { expiresIn: '7d' })
    };
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
