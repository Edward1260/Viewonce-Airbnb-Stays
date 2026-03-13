import { Controller, Post, Body, UseGuards, Request, Get, Param } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { SignupDto } from './dto/signup.dto';
import { JwtAuthGuard } from './jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('signup')
  async signup(@Body() signupDto: SignupDto) {
    return this.authService.signup(signupDto);
  }

  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Post('refresh')
  async refresh(@Body() body: { refreshToken: string }) {
    return this.authService.refreshToken(body.refreshToken);
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  async logout(@Request() req) {
    return this.authService.logout(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  getProfile(@Request() req) {
    return req.user;
  }

  // ==================== Platform Master Hub Setup Endpoints ====================

  /**
   * Check if setup is required (one-time setup for super admin)
   * GET /api/v1/auth/setup-status
   */
  @Get('setup-status')
  async getSetupStatus() {
    return this.authService.isSetupRequired();
  }

  /**
   * Create super admin account (one-time setup)
   * POST /api/v1/auth/setup
   */
  @Post('setup')
  async setup(@Body() body: any) {
    return this.authService.createSuperAdmin(body);
  }

  // ==================== Email Verification Endpoints ====================

  /**
   * Send email verification link
   * POST /api/v1/auth/verify-email/send
   */
  @UseGuards(JwtAuthGuard)
  @Post('verify-email/send')
  async sendVerificationEmail(@Request() req) {
    return this.authService.sendVerificationEmail(req.user.id);
  }

  /**
   * Verify email with token
   * POST /api/v1/auth/verify-email/:token
   */
  @Post('verify-email/:token')
  async verifyEmail(@Param('token') token: string) {
    return this.authService.verifyEmail(token);
  }

  // ==================== Two-Factor Authentication Endpoints ====================

  /**
   * Enable 2FA - returns QR code for authenticator app
   * POST /api/v1/auth/2fa/enable
   */
  @UseGuards(JwtAuthGuard)
  @Post('2fa/enable')
  async enable2FA(@Request() req) {
    return this.authService.enable2FA(req.user.id);
  }

  /**
   * Verify and activate 2FA
   * POST /api/v1/auth/2fa/verify
   */
  @UseGuards(JwtAuthGuard)
  @Post('2fa/verify')
  async verify2FA(@Request() req, @Body() body: { code: string }) {
    return this.authService.verifyAndActivate2FA(req.user.id, body.code);
  }

  /**
   * Disable 2FA
   * POST /api/v1/auth/2fa/disable
   */
  @UseGuards(JwtAuthGuard)
  @Post('2fa/disable')
  async disable2FA(@Request() req, @Body() body: { code: string }) {
    return this.authService.disable2FA(req.user.id, body.code);
  }

  /**
   * Login with 2FA code
   * POST /api/v1/auth/login/2fa
   */
  @Post('login/2fa')
  async loginWith2FA(@Body() body: { email: string; password: string; code: string }) {
    return this.authService.loginWith2FA(body.email, body.password, body.code);
  }

  /**
   * Get 2FA status for current user
   * GET /api/v1/auth/2fa/status
   */
  @UseGuards(JwtAuthGuard)
  @Get('2fa/status')
  async get2FAStatus(@Request() req) {
    return this.authService.get2FAStatus(req.user.id);
  }
}
