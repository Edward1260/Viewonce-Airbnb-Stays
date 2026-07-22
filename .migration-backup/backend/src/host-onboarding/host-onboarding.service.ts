import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HostOnboarding, OnboardingStatus, OnboardingStep, VerificationStatus } from '../entities/host-onboarding.entity';
import { User } from '../entities/user.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../entities/notification.entity';

@Injectable()
export class HostOnboardingService {
  constructor(
    @InjectRepository(HostOnboarding)
    private onboardingRepository: Repository<HostOnboarding>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private notificationsService: NotificationsService,
  ) {}

  async createOnboarding(hostId: string): Promise<HostOnboarding> {
    const host = await this.userRepository.findOne({ where: { id: hostId } });
    if (!host) {
      throw new NotFoundException('Host not found');
    }

    if (host.role !== 'host') {
      throw new BadRequestException('User must be a host to start onboarding');
    }

    // Check if onboarding already exists
    const existing = await this.onboardingRepository.findOne({ where: { hostId } });
    if (existing) {
      return existing;
    }

    const onboarding = this.onboardingRepository.create({
      hostId,
      status: OnboardingStatus.NOT_STARTED,
      currentStep: OnboardingStep.ACCOUNT_SETUP,
      completedSteps: [],
      stepData: {},
      progressPercentage: 0,
    });

    return this.onboardingRepository.save(onboarding);
  }

  async getOnboarding(hostId: string): Promise<HostOnboarding> {
    const onboarding = await this.onboardingRepository.findOne({
      where: { hostId },
      relations: ['host'],
    });

    if (!onboarding) {
      throw new NotFoundException('Onboarding not found');
    }

    return onboarding;
  }

  async updateStep(hostId: string, step: OnboardingStep, stepData: any): Promise<HostOnboarding> {
    const onboarding = await this.getOnboarding(hostId);

    if (onboarding.status === OnboardingStatus.APPROVED) {
      throw new BadRequestException('Onboarding is already completed');
    }

    // Update step data
    onboarding.stepData = { ...onboarding.stepData, [step]: stepData };
    onboarding.lastActivity = new Date();

    // Mark step as completed if not already
    if (!onboarding.completedSteps.includes(step)) {
      onboarding.completedSteps.push(step);
      onboarding.progressPercentage = Math.round((onboarding.completedSteps.length / 7) * 100);
    }

    // Update current step
    onboarding.currentStep = this.getNextStep(onboarding.completedSteps);

    // Check if all steps are completed
    if (onboarding.completedSteps.length === 7) {
      onboarding.status = OnboardingStatus.PENDING_REVIEW;
    } else {
      onboarding.status = OnboardingStatus.IN_PROGRESS;
    }

    return this.onboardingRepository.save(onboarding);
  }

  async submitForReview(hostId: string): Promise<HostOnboarding> {
    const onboarding = await this.getOnboarding(hostId);

    if (onboarding.completedSteps.length < 7) {
      throw new BadRequestException('All steps must be completed before submitting for review');
    }

    onboarding.status = OnboardingStatus.PENDING_REVIEW;
    onboarding.attempts += 1;

    // Notify admins
    await this.notificationsService.create(
      'admin-user-id', // This should be replaced with actual admin ID
      'New Host Application',
      `Host ${onboarding.host.firstName} ${onboarding.host.lastName} has submitted their onboarding application for review.`,
      NotificationType.SYSTEM_MESSAGE,
      { hostId, onboardingId: onboarding.id }
    );

    return this.onboardingRepository.save(onboarding);
  }

  async approveOnboarding(onboardingId: string, adminId: string, notes?: string): Promise<HostOnboarding> {
    const onboarding = await this.onboardingRepository.findOne({
      where: { id: onboardingId },
      relations: ['host'],
    });

    if (!onboarding) {
      throw new NotFoundException('Onboarding not found');
    }

    onboarding.status = OnboardingStatus.APPROVED;
    onboarding.reviewedBy = adminId;
    onboarding.approvedAt = new Date();
    onboarding.reviewNotes = notes;

    // Update host status
    await this.userRepository.update(onboarding.hostId, { status: 'active' });

    // Notify host
    await this.notificationsService.create(
      onboarding.hostId,
      'Host Application Approved',
      'Congratulations! Your host application has been approved. You can now start listing properties.',
      NotificationType.PROPERTY_APPROVED,
      { onboardingId: onboarding.id }
    );

    return this.onboardingRepository.save(onboarding);
  }

  async rejectOnboarding(onboardingId: string, adminId: string, reason: string): Promise<HostOnboarding> {
    const onboarding = await this.onboardingRepository.findOne({
      where: { id: onboardingId },
      relations: ['host'],
    });

    if (!onboarding) {
      throw new NotFoundException('Onboarding not found');
    }

    onboarding.status = OnboardingStatus.REJECTED;
    onboarding.reviewedBy = adminId;
    onboarding.rejectionReason = reason;

    // Notify host
    await this.notificationsService.create(
      onboarding.hostId,
      'Host Application Rejected',
      `Your host application has been rejected. Reason: ${reason}`,
      NotificationType.PROPERTY_REJECTED,
      { onboardingId: onboarding.id }
    );

    return this.onboardingRepository.save(onboarding);
  }

  async updateVerificationStatus(
    hostId: string,
    type: 'profile' | 'id' | 'payment',
    status: VerificationStatus
  ): Promise<HostOnboarding> {
    const onboarding = await this.getOnboarding(hostId);

    switch (type) {
      case 'profile':
        onboarding.profileVerificationStatus = status;
        break;
      case 'id':
        onboarding.idVerificationStatus = status;
        break;
      case 'payment':
        onboarding.paymentVerificationStatus = status;
        break;
    }

    return this.onboardingRepository.save(onboarding);
  }

  async uploadDocument(hostId: string, documentType: string, filePath: string): Promise<HostOnboarding> {
    const onboarding = await this.getOnboarding(hostId);

    const uploadedDocs = onboarding.uploadedDocuments || {};
    if (!uploadedDocs[documentType]) {
      uploadedDocs[documentType] = [];
    }
    uploadedDocs[documentType].push(filePath);

    onboarding.uploadedDocuments = uploadedDocs;

    return this.onboardingRepository.save(onboarding);
  }

  async getPendingReviews(): Promise<HostOnboarding[]> {
    return this.onboardingRepository.find({
      where: { status: OnboardingStatus.PENDING_REVIEW },
      relations: ['host'],
      order: { updatedAt: 'ASC' },
    });
  }

  private getNextStep(completedSteps: OnboardingStep[]): OnboardingStep {
    const allSteps = [
      OnboardingStep.ACCOUNT_SETUP,
      OnboardingStep.PROFILE_VERIFICATION,
      OnboardingStep.ID_VERIFICATION,
      OnboardingStep.PROPERTY_SETUP,
      OnboardingStep.PAYMENT_SETUP,
      OnboardingStep.POLICIES_ACCEPTANCE,
      OnboardingStep.FINAL_REVIEW,
    ];

    for (const step of allSteps) {
      if (!completedSteps.includes(step)) {
        return step;
      }
    }

    return OnboardingStep.FINAL_REVIEW;
  }
}
