import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';

export enum InvitationStatus {
  PENDING = 'pending',
  USED = 'used',
  EXPIRED = 'expired',
  CANCELLED = 'cancelled',
}

@Entity('host_invitations')
export class HostInvitation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  token: string;

  @Column()
  email: string;

  @Column({ nullable: true })
  phone: string;

  @Column({ nullable: true })
  message: string;

  // Role for the invitation (admin, support, host)
  @Column({ default: 'host' })
  role: string;

  // Whether this is a one-time invitation
  @Column({ default: true })
  isOneTime: boolean;

  @Column({ default: 'pending' })
  status: string;

  @Column()
  expiresAt: Date;

  @Column({ nullable: true })
  usedAt: Date;

  @Column({ nullable: true })
  usedById: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'usedById' })
  usedBy: User;

  @Column()
  createdById: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'createdById' })
  createdBy: User;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Helper method to check if invitation is expired
  isExpired(): boolean {
    return new Date() > this.expiresAt;
  }

  // Helper method to check if invitation is valid
  isValid(): boolean {
    return this.status === InvitationStatus.PENDING && !this.isExpired();
  }
}
