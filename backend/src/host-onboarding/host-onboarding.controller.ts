import { Controller, Get, Post, Put, Body, Param, UseGuards, Request, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { HostOnboardingService } from './host-onboarding.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../entities/user.entity';
import { OnboardingStep, VerificationStatus } from '../entities/host-onboarding.entity';
import { Express } from 'express';

@Controller('host-onboarding')
@UseGuards(JwtAuthGuard, RolesGuard)
export class HostOnboardingController {
  constructor(private readonly onboardingService: HostOnboardingService) {}

  @Get()
  @Roles(UserRole.HOST)
  async getMyOnboarding(@Request() req) {
    return this.onboardingService.getOnboarding(req.user.userId);
  }

  @Post()
  @Roles(UserRole.HOST)
  async createOnboarding(@Request() req) {
    return this.onboardingService.createOnboarding(req.user.userId);
  }

  @Put('step')
  @Roles(UserRole.HOST)
  async updateStep(
    @Request() req,
    @Body() body: { step: OnboardingStep; stepData: any }
  ) {
    return this.onboardingService.updateStep(req.user.userId, body.step, body.stepData);
  }

  @Post('submit')
  @Roles(UserRole.HOST)
  async submitForReview(@Request() req) {
    return this.onboardingService.submitForReview(req.user.userId);
  }

  @Post('approve/:id')
  @Roles(UserRole.ADMIN)
  async approveOnboarding(
    @Param('id') id: string,
    @Request() req,
    @Body() body: { notes?: string }
  ) {
    return this.onboardingService.approveOnboarding(id, req.user.userId, body.notes);
  }

  @Post('reject/:id')
  @Roles(UserRole.ADMIN)
  async rejectOnboarding(
    @Param('id') id: string,
    @Request() req,
    @Body() body: { reason: string }
  ) {
    return this.onboardingService.rejectOnboarding(id, req.user.userId, body.reason);
  }

  @Get('pending')
  @Roles(UserRole.ADMIN)
  async getPendingReviews() {
    return this.onboardingService.getPendingReviews();
  }

  @Put('verification/:type')
  @Roles(UserRole.HOST)
  async updateVerificationStatus(
    @Request() req,
    @Param('type') type: 'profile' | 'id' | 'payment',
    @Body() body: { status: VerificationStatus }
  ) {
    return this.onboardingService.updateVerificationStatus(req.user.userId, type, body.status);
  }

  @Post('upload/:documentType')
  @Roles(UserRole.HOST)
  @UseInterceptors(FileInterceptor('file'))
  async uploadDocument(
    @Request() req,
    @Param('documentType') documentType: string,
    @UploadedFile() file: Express.Multer.File
  ) {
    // In a real implementation, you'd save the file and get the path
    const filePath = `/uploads/${file.filename}`;
    return this.onboardingService.uploadDocument(req.user.userId, documentType, filePath);
  }
}
