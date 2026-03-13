import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';

export enum AcceptanceType {
  SIGNUP = 'signup',
  BOOKING = 'booking',
  HOST_INVITATION = 'host_invitation',
}

@Entity('terms_acceptance')
export class TermsAcceptance {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column('varchar')
  type: AcceptanceType;

  @Column({ nullable: true })
  ipAddress?: string;

  @Column({ nullable: true })
  userAgent?: string;

  @CreateDateColumn()
  acceptedAt: Date;

  @Column({ nullable: true })
  invitationToken?: string; // For host invitations
}
