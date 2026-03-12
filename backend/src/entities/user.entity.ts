
import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, OneToMany, ManyToOne, JoinColumn, Index } from 'typeorm';

import { Property } from './property.entity';
import { Booking } from './booking.entity';
import { Review } from './review.entity';
import { Wishlist } from './wishlist.entity';

export enum UserRole {
  CUSTOMER = 'customer',
  HOST = 'host',
  ADMIN = 'admin',
  SUPPORT = 'support',
  PLATFORM_MASTER_HUB = 'platform_master_hub',
  SUPER_ADMIN = 'super_admin'
}

export enum UserStatus {
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  INACTIVE = 'inactive'
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ unique: true })
  email: string;

  @Column()
  password: string;

  @Column()
  firstName: string;

  @Column()
  lastName: string;

  @Column({ nullable: true })
  phone: string;

  @Index()
  @Column({ default: UserRole.CUSTOMER })
  role: string;

  @Index()
  @Column({ default: UserStatus.ACTIVE })
  status: string;

  @Column({ nullable: true })
  profileImage: string;

  @Column({ nullable: true })
  bio: string;

  @Column({ nullable: true })
  location: string;

  @Column({ type: 'date', nullable: true })
  dateOfBirth: Date;

  @Column({ default: false })
  isEmailVerified: boolean;

  @Column({ nullable: true })
  emailVerificationToken: string;

  @Column({ nullable: true })
  passwordResetToken: string;

  @Column({ nullable: true })
  passwordResetExpires: Date;

  @Index()
  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ nullable: true })
  lastLoginAt: Date;

  @Column({ nullable: true })
  suspensionReason: string;

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  walletBalance: number;

  // MFA properties
  @Column({ nullable: true })
  mfaSecret: string;

  @Column({ default: false })
  mfaEnabled: boolean;


  @Column('simple-array', { nullable: true })
  backupCodes: string[];

  // Host assignment to admin (for hierarchical management)
  @Index()
  @Column({ nullable: true })
  assignedAdminId: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'assignedAdminId' })
  assignedAdmin: User;

  // Relations
  @OneToMany(() => Property, property => property.host)
  properties: Property[];

  @OneToMany(() => Booking, booking => booking.user)
  bookings: Booking[];

  @OneToMany(() => Review, review => review.user)
  reviews: Review[];

  @OneToMany(() => Wishlist, wishlist => wishlist.user)
  wishlist: Wishlist[];
}
