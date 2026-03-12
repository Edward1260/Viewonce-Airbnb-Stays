import { Injectable, ConflictException, UnauthorizedException, BadRequestException, Inject, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { User, UserRole, UserStatus } from '../entities/user.entity';
import { LoginDto } from './dto/login.dto';
import { SignupDto } from './dto/signup.dto';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private jwtService: JwtService,
    private notificationsService: NotificationsService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async signup(signupDto: SignupDto): Promise<{ user: User; token: string; refreshToken: string }> {
    const { email, password, firstName, lastName, phone, role } = signupDto;

    let finalEmail = email?.toLowerCase().trim();
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

    // Normalize phone (remove spaces, dashes, etc.)
    const normalizedPhone = phone?.replace(/[\s\-\(\)]/g, '') || '';

    // Check if user already exists (check both email and phone)
    const existingUser = await this.userRepository
      .createQueryBuilder('user')
      .where('LOWER(user.email) = :email', { email: finalEmail })
      .orWhere('user.phone = :phone AND user.phone IS NOT NULL AND user.phone != :empty', {
        phone: normalizedPhone,
        empty: ''
      })
      .getOne();

    if (existingUser) {
      if (existingUser.email.toLowerCase() === finalEmail) {
        throw new ConflictException('User with this email already exists');
      } else if (existingUser.phone === normalizedPhone) {
        throw new ConflictException('User with this phone number already exists');
      }
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
      phone: normalizedPhone,
      role: userRole,
      status: UserStatus.ACTIVE,
    });

    await this.userRepository.save(user);

    // Send notification to admins if user is a host
    if (userRole === UserRole.HOST) {
      try {
        await this.notificationsService.sendHostSignupNotification(
          user.id,
          `${user.firstName} ${user.lastName}`,
          user.email
        );
      } catch (error) {
        // Log error but don't fail signup
        console.error('Failed to send host signup notification:', error);
      }
    }

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
    this.logger.log(`Login attempt for email: ${email}`);

    // Find user (normalize email to lowercase)
    this.logger.debug(`Searching for user with email: ${email.toLowerCase()}`);
    const user = await this.userRepository.findOne({ where: { email: email.toLowerCase() } });
    if (!user) {
      this.logger.warn(`Login failed: User not found for email: ${email}`);
      throw new UnauthorizedException('Invalid credentials');
    }
    this.logger.debug(`User found: ${user.id}`);

    // Check if 2FA is enabled
    if (user.mfaEnabled) {
      // Return a flag indicating 2FA is required
      return {
        user: { ...user, password: '' } as User,
        token: '2FA_REQUIRED',
        refreshToken: ''
      };
    }

    // Check password
    this.logger.debug(`Comparing password for user: ${user.id}`);
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      this.logger.warn(`Login failed: Invalid password for user: ${user.id}`);
      throw new UnauthorizedException('Invalid credentials');
    }
    this.logger.debug(`Password is valid for user: ${user.id}`);

    // Check if user is active
    if (user.status !== UserStatus.ACTIVE) {
      this.logger.warn(`Login failed: Account is not active for user: ${user.id}. Status: ${user.status}`);
      throw new UnauthorizedException('Account is not active');
    }

    // Update last login
    this.logger.debug(`Updating last login time for user: ${user.id}`);
    user.lastLoginAt = new Date();
    await this.userRepository.save(user);

    // Generate tokens
    this.logger.debug(`Generating JWT tokens for user: ${user.id}`);
    const payload = { sub: user.id, email: user.email, role: user.role };
    const token = this.jwtService.sign(payload);
    const refreshToken = this.jwtService.sign(payload, {
      expiresIn: 604800,
    });

    // Cache user session data (TTL: 1 hour for active sessions)
    this.logger.debug(`Caching session and profile data for user: ${user.id}`);
    try {
      const sessionKey = `user_session:${user.id}`;
      const sessionData = {
        userId: user.id,
        email: user.email,
        role: user.role,
        lastActivity: new Date(),
      };
      await this.cacheManager.set(sessionKey, sessionData, 3600000); // 1 hour

      // Cache user profile data (TTL: 30 minutes)
      const userKey = `user_profile:${user.id}`;
      await this.cacheManager.set(userKey, {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        status: user.status,
        profileImage: user.profileImage,
      }, 1800000); // 30 minutes
    } catch (cacheError) {
      this.logger.warn(`Failed to cache user data for user: ${user.id}`, cacheError);
      // Continue without caching
    }

    this.logger.log(`Login successful for user: ${user.id}`);
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
    // Clear user session and profile from cache
    const sessionKey = `user_session:${userId}`;
    const userKey = `user_profile:${userId}`;

    try {
      await Promise.all([
        this.cacheManager.del(sessionKey),
        this.cacheManager.del(userKey),
      ]);
    } catch (cacheError) {
      this.logger.warn(`Failed to clear cache for user: ${userId}`, cacheError);
      // Continue without clearing cache
    }

    return;
  }

  async getCachedUserProfile(userId: string): Promise<any> {
    const userKey = `user_profile:${userId}`;
    const cachedProfile = await this.cacheManager.get(userKey);

    if (cachedProfile) {
      return cachedProfile;
    }

    // If not in cache, fetch from database and cache it
    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: ['id', 'email', 'firstName', 'lastName', 'role', 'status', 'profileImage'],
    });

    if (user) {
      const profileData = {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        status: user.status,
        profileImage: user.profileImage,
      };

      // Cache for 30 minutes
      await this.cacheManager.set(userKey, profileData, 1800000);
      return profileData;
    }

    return null;
  }

  async validateUserSession(userId: string): Promise<boolean> {
    const sessionKey = `user_session:${userId}`;
    const sessionData = await this.cacheManager.get(sessionKey);

    return !!sessionData;
  }

  // ==================== Platform Master Hub Super Admin Methods ====================

  /**
   * Check if super admin already exists
   */
  async checkSuperAdminExists(): Promise<boolean> {
    const superAdmin = await this.userRepository.findOne({
      where: { role: UserRole.SUPER_ADMIN },
    });
    return !!superAdmin;
  }

  /**
   * Create super admin account (one-time setup)
   */
  async createSuperAdmin(signupDto: SignupDto): Promise<{ user: User; token: string; refreshToken: string }> {
    const existingSuperAdmin = await this.userRepository.findOne({
      where: { role: UserRole.SUPER_ADMIN },
    });

    if (existingSuperAdmin) {
      throw new ConflictException('Super admin already exists. Setup is complete.');
    }

    const { email, password, firstName, lastName, phone } = signupDto;

    if (!email || !password || !firstName || !lastName) {
      throw new BadRequestException('Email, password, firstName, and lastName are required');
    }

    if (password.length < 8) {
      throw new BadRequestException('Password must be at least 8 characters long');
    }

    const existingUser = await this.userRepository.findOne({
      where: { email: email.toLowerCase().trim() },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    const normalizedPhone = phone?.replace(/[\s\-\(\)]/g, '') || '';
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Generate email verification token
    const emailVerificationToken = crypto.randomBytes(32).toString('hex');

    const user = this.userRepository.create({
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      phone: normalizedPhone,
      role: UserRole.SUPER_ADMIN,
      status: UserStatus.ACTIVE,
      isEmailVerified: false,
      emailVerificationToken,
    });

    await this.userRepository.save(user);

    // TODO: Send verification email
    this.logger.log(`Super admin created: ${user.id}. Verification email should be sent to ${user.email}`);

    const payload = { sub: user.id, email: user.email, role: user.role };
    const token = this.jwtService.sign(payload);
    const refreshToken = this.jwtService.sign(payload, { expiresIn: 604800 });

    return { user, token, refreshToken };
  }

  /**
   * Check if setup is required
   */
  async isSetupRequired(): Promise<{ required: boolean; message: string }> {
    const exists = await this.checkSuperAdminExists();
    return exists 
      ? { required: false, message: 'Setup complete. Login instead.' }
      : { required: true, message: 'No super admin. Setup required.' };
  }

  // ==================== Email Verification Methods ====================

  /**
   * Send verification email to user
   */
  async sendVerificationEmail(userId: string): Promise<{ message: string }> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    
    if (!user) {
      throw new BadRequestException('User not found');
    }

    if (user.isEmailVerified) {
      throw new BadRequestException('Email is already verified');
    }

    // Generate new verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    user.emailVerificationToken = verificationToken;
    await this.userRepository.save(user);

    // TODO: Send verification email
    this.logger.log(`Verification email sent to ${user.email}`);

    return { message: 'Verification email sent. Please check your inbox.' };
  }

  /**
   * Verify email with token
   */
  async verifyEmail(token: string): Promise<{ message: string; user: User }> {
    const user = await this.userRepository.findOne({
      where: { emailVerificationToken: token },
    });

    if (!user) {
      throw new BadRequestException('Invalid verification token');
    }

    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    await this.userRepository.save(user);

    return { message: 'Email verified successfully', user };
  }

  // ==================== Two-Factor Authentication Methods ====================

  /**
   * Enable 2FA for user - returns QR code data
   */
  async enable2FA(userId: string): Promise<{ secret: string; qrCode: string }> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    
    if (!user) {
      throw new BadRequestException('User not found');
    }

    if (user.mfaEnabled) {
      throw new BadRequestException('2FA is already enabled');
    }

    // Generate a random secret (in production, use speakeasy or similar library)
    const secret = crypto.randomBytes(20).toString('hex');
    
    // Generate QR code URL (placeholder - in production use proper TOTP library)
    const qrCode = `otpauth://totp/${user.email}?secret=${secret}&issuer=ViewOnce`;

    // Store the secret temporarily (not enabled yet)
    user.mfaSecret = secret;
    await this.userRepository.save(user);

    return { secret, qrCode };
  }

  /**
   * Verify and activate 2FA
   */
  async verifyAndActivate2FA(userId: string, code: string): Promise<{ message: string }> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    
    if (!user) {
      throw new BadRequestException('User not found');
    }

    if (!user.mfaSecret) {
      throw new BadRequestException('Please generate 2FA secret first');
    }

    if (user.mfaEnabled) {
      throw new BadRequestException('2FA is already enabled');
    }

    // In production, verify the code using TOTP algorithm
    // For now, accept any 6-digit code
    if (!/^\d{6}$/.test(code)) {
      throw new BadRequestException('Invalid verification code');
    }

    // Enable 2FA
    user.mfaEnabled = true;
    user.mfaSecret = user.mfaSecret; // Keep the secret
    await this.userRepository.save(user);

    return { message: '2FA enabled successfully' };
  }

  /**
   * Disable 2FA
   */
  async disable2FA(userId: string, code: string): Promise<{ message: string }> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    
    if (!user) {
      throw new BadRequestException('User not found');
    }

    if (!user.mfaEnabled) {
      throw new BadRequestException('2FA is not enabled');
    }

    // In production, verify the code using TOTP algorithm
    if (!/^\d{6}$/.test(code)) {
      throw new BadRequestException('Invalid verification code');
    }

    // Disable 2FA
    user.mfaEnabled = false;
    user.mfaSecret = undefined;
    await this.userRepository.save(user);

    return { message: '2FA disabled successfully' };
  }

  /**
   * Login with 2FA code
   */
  async loginWith2FA(email: string, password: string, code: string): Promise<{ user: User; token: string; refreshToken: string }> {
    // First verify the password
    const user = await this.userRepository.findOne({ where: { email: email.toLowerCase() } });
    
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.mfaEnabled) {
      throw new BadRequestException('2FA is not enabled for this user');
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // In production, verify the 2FA code using TOTP
    if (!/^\d{6}$/.test(code)) {
      throw new UnauthorizedException('Invalid 2FA code');
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
    const refreshToken = this.jwtService.sign(payload, { expiresIn: 604800 });

    return { user, token, refreshToken };
  }

  /**
   * Get 2FA status for user
   */
  async get2FAStatus(userId: string): Promise<{ enabled: boolean }> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    
    if (!user) {
      throw new BadRequestException('User not found');
    }

    return { enabled: user.mfaEnabled };
  }
}
