import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import * as speakeasy from 'speakeasy';
import * as qrcode from 'qrcode';

@Injectable()
export class MfaService {
  private readonly logger = new Logger(MfaService.name);

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async generateMfaSecret(userId: string): Promise<{
    secret: string;
    qrCodeUrl: string;
    otpauthUrl: string;
  }> {
    try {
      const user = await this.userRepository.findOne({ where: { id: userId } });
      if (!user) {
        throw new Error('User not found');
      }

      // Generate TOTP secret
      const secret = speakeasy.generateSecret({
        name: `ViewOnce Platform (${user.email})`,
        issuer: 'ViewOnce Platform',
      });

      // Generate QR code
      const qrCodeUrl = await qrcode.toDataURL(secret.otpauth_url);

      return {
        secret: secret.base32,
        qrCodeUrl,
        otpauthUrl: secret.otpauth_url,
      };
    } catch (error) {
      this.logger.error(`Failed to generate MFA secret: ${error.message}`);
      throw error;
    }
  }

  async enableMfa(userId: string, secret: string, token: string): Promise<boolean> {
    try {
      // Verify the token first
      const isValid = this.verifyMfaToken(secret, token);
      if (!isValid) {
        return false;
      }

      // Update user with MFA secret
      await this.userRepository.update(userId, {
        mfaSecret: secret,
        mfaEnabled: true,
      });

      this.logger.log(`MFA enabled for user ${userId}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to enable MFA: ${error.message}`);
      throw error;
    }
  }

  async disableMfa(userId: string, token: string): Promise<boolean> {
    try {
      const user = await this.userRepository.findOne({ where: { id: userId } });
      if (!user || !user.mfaSecret) {
        throw new Error('MFA not enabled for this user');
      }

      // Verify the token before disabling
      const isValid = this.verifyMfaToken(user.mfaSecret, token);
      if (!isValid) {
        return false;
      }

      // Disable MFA
      await this.userRepository.update(userId, {
        mfaSecret: null,
        mfaEnabled: false,
      });

      this.logger.log(`MFA disabled for user ${userId}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to disable MFA: ${error.message}`);
      throw error;
    }
  }

  verifyMfaToken(secret: string, token: string): boolean {
    try {
      return speakeasy.totp.verify({
        secret: secret,
        encoding: 'base32',
        token: token,
        window: 2, // Allow 2 time windows (30 seconds each)
      });
    } catch (error) {
      this.logger.error(`Failed to verify MFA token: ${error.message}`);
      return false;
    }
  }

  async isMfaEnabled(userId: string): Promise<boolean> {
    try {
      const user = await this.userRepository.findOne({
        where: { id: userId },
        select: ['mfaEnabled'],
      });
      return user?.mfaEnabled || false;
    } catch (error) {
      this.logger.error(`Failed to check MFA status: ${error.message}`);
      return false;
    }
  }

  async getMfaStatus(userId: string): Promise<{
    enabled: boolean;
    required: boolean;
  }> {
    try {
      const user = await this.userRepository.findOne({
        where: { id: userId },
        select: ['mfaEnabled', 'role'],
      });

      if (!user) {
        return { enabled: false, required: false };
      }

      // MFA is required for admin users
      const required = user.role === 'admin';

      return {
        enabled: user.mfaEnabled || false,
        required,
      };
    } catch (error) {
      this.logger.error(`Failed to get MFA status: ${error.message}`);
      return { enabled: false, required: false };
    }
  }

  async validateMfaForAction(userId: string, token: string, action: string): Promise<boolean> {
    try {
      const user = await this.userRepository.findOne({ where: { id: userId } });
      if (!user || !user.mfaEnabled || !user.mfaSecret) {
        // If MFA is not enabled, allow the action (for backward compatibility)
        return true;
      }

      // For critical actions, always require MFA
      const criticalActions = [
        'restart-service',
        'force-gc',
        'backup-restore',
        'clear-cache',
        'system-restart',
      ];

      if (criticalActions.includes(action)) {
        return this.verifyMfaToken(user.mfaSecret, token);
      }

      // For other actions, MFA verification is optional but recommended
      return true;
    } catch (error) {
      this.logger.error(`Failed to validate MFA for action: ${error.message}`);
      return false;
    }
  }

  async generateBackupCodes(userId: string): Promise<string[]> {
    try {
      // Generate 10 backup codes
      const backupCodes = [];
      for (let i = 0; i < 10; i++) {
        const code = speakeasy.generateSecret({ length: 10 }).base32.substring(0, 8).toUpperCase();
        backupCodes.push(code);
      }

      // Hash and store backup codes (simplified - in production, hash them)
      const hashedCodes = backupCodes.map(code => this.hashBackupCode(code));

      await this.userRepository.update(userId, {
        backupCodes: hashedCodes,
      });

      this.logger.log(`Backup codes generated for user ${userId}`);
      return backupCodes;
    } catch (error) {
      this.logger.error(`Failed to generate backup codes: ${error.message}`);
      throw error;
    }
  }

  private hashBackupCode(code: string): string {
    // In production, use proper hashing like bcrypt
    // For now, simple hash
    return require('crypto').createHash('sha256').update(code).digest('hex');
  }

  async validateBackupCode(userId: string, code: string): Promise<boolean> {
    try {
      const user = await this.userRepository.findOne({ where: { id: userId } });
      if (!user || !user.backupCodes) {
        return false;
      }

      const hashedCode = this.hashBackupCode(code.toUpperCase());
      const codeIndex = user.backupCodes.indexOf(hashedCode);

      if (codeIndex === -1) {
        return false;
      }

      // Remove used backup code
      user.backupCodes.splice(codeIndex, 1);
      await this.userRepository.save(user);

      this.logger.log(`Backup code used for user ${userId}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to validate backup code: ${error.message}`);
      return false;
    }
  }
}
