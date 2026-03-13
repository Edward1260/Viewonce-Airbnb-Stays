import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';

export enum OnboardingStep {
  ACCOUNT_SETUP = 'account_setup',
  PROFILE_VERIFICATION = 'profile_verification',
  ID_VERIFICATION = 'id_verification',
  PROPERTY_SETUP = 'property_setup',
  PAYMENT_SETUP = 'payment_setup',
  POLICIES_ACCEPTANCE = 'policies_acceptance',
  FINAL_REVIEW = 'final_review',
  COMPLETED = 'completed'
}

export enum OnboardingStatus {
  NOT_STARTED = 'not_started',
  IN_PROGRESS = 'in_progress',
  PENDING_REVIEW = 'pending_review',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  SUSPENDED = 'suspended'
}

export enum VerificationStatus {
  PENDING = 'pending',
  SUBMITTED = 'submitted',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  EXPIRED = 'expired'
}

@Entity('host_onboardings')
export class HostOnboarding {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  hostId: string;

  @ManyToOne(() => User, user => user.id, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'hostId' })
  host: User;

  @Column({ default: OnboardingStatus.NOT_STARTED })
  status: string;

  @Column({ default: OnboardingStep.ACCOUNT_SETUP })
  currentStep: string;

  @Column('json', { nullable: true })
  completedSteps: OnboardingStep[];

  @Column('json', { nullable: true })
  stepData: Record<string, any>; // Store data for each step

  // Verification statuses
  @Column({ default: VerificationStatus.PENDING })
  profileVerificationStatus: string;

  @Column({ default: VerificationStatus.PENDING })
  idVerificationStatus: string;

  @Column({ default: VerificationStatus.PENDING })
  paymentVerificationStatus: string;

  // Documents and files
  @Column('json', { nullable: true })
  uploadedDocuments: Record<string, string[]>; // File paths for uploaded docs

  @Column({ type: 'text', nullable: true })
  idDocumentPath: string;

  @Column({ type: 'text', nullable: true })
  profilePhotoPath: string;

  @Column({ type: 'text', nullable: true })
  businessLicensePath: string;

  // Review and approval
  @Column({ type: 'text', nullable: true })
  reviewNotes: string;

  @Column({ type: 'text', nullable: true })
  rejectionReason: string;

  @Column({ type: 'text', nullable: true })
  reviewedBy: string; // Admin user ID

  @Column({ type: 'text', nullable: true })
  approvedAt: Date;

  // Progress tracking
  @Column('int', { default: 0 })
  progressPercentage: number;

  @Column({ type: 'text', nullable: true })
  lastActivity: Date;

  @Column('int', { default: 0 })
  attempts: number; // Number of submission attempts

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ type: 'text', nullable: true })
  expiresAt: Date; // When onboarding expires if not completed
}
