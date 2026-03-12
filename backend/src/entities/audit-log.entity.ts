import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';

export enum AuditAction {
  REMEDIATION = 'remediation',
  LOGIN = 'login',
  LOGOUT = 'logout',
  USER_CREATE = 'user_create',
  USER_UPDATE = 'user_update',
  USER_DELETE = 'user_delete',
  PROPERTY_APPROVE = 'property_approve',
  PROPERTY_REJECT = 'property_reject',
  BOOKING_CANCEL = 'booking_cancel',
  PAYMENT_REFUND = 'payment_refund',
  SYSTEM_RESTART = 'system_restart',
  CACHE_CLEAR = 'cache_clear',
  BACKUP_CREATE = 'backup_create',
  BACKUP_RESTORE = 'backup_restore',
  SYSTEM_ALERT = 'system_alert',
}

export enum AuditSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

@Entity('audit_logs')
export class AuditLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    type: 'varchar',
  })
  action: string;

  @Column({ type: 'text' })
  description: string;

  @Column({
    type: 'varchar',
    default: AuditSeverity.LOW,
  })
  severity: string;

  @Column({ type: 'json', nullable: true })
  metadata: Record<string, any>;

  @Column({ nullable: true })
  ipAddress: string;

  @Column({ nullable: true })
  userAgent: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ nullable: true })
  userId: string;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ type: 'varchar', length: 50, nullable: true })
  service: string; // Which service performed the action

  @Column({ type: 'boolean', default: false })
  requiresMfa: boolean; // Whether MFA was required for this action
}
