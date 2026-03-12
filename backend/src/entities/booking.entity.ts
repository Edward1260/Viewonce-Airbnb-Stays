import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { User } from './user.entity';
import { Property } from './property.entity';

export enum BookingStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  CANCELLED = 'cancelled',
  COMPLETED = 'completed',
  PAID_PENDING_CHECKIN = 'paid_pending_checkin',
  RESERVED_PAYMENT_PENDING = 'reserved_payment_pending',
  EXPIRED = 'expired'
}

export enum PaymentStatus {
  PENDING = 'pending',
  PAID = 'paid',
  REFUNDED = 'refunded',
  FAILED = 'failed',
  ESCROW_HELD = 'escrow_held',
  RELEASED = 'released'
}

export enum RefundStatus {
  NONE = 'none',
  REQUESTED = 'requested',
  APPROVED = 'approved',
  PROCESSED = 'processed',
  REJECTED = 'rejected',
  DISPUTED = 'disputed'
}

@Entity('bookings')
export class Booking {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  userId: string;

  @ManyToOne(() => User, user => user.bookings, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Index()
  @Column()
  propertyId: string;

  @ManyToOne(() => Property, property => property.bookings, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'propertyId' })
  property: Property;

  @Index()
  @Column('date')
  checkIn: Date;

  @Index()
  @Column('date')
  checkOut: Date;

  @Column('int')
  guests: number;

  @Column('decimal', { precision: 10, scale: 2 })
  totalPrice: number;

  @Index()
  @Column({ default: BookingStatus.PENDING })
  status: string;

  @Column({ default: PaymentStatus.PENDING })
  paymentStatus: string;

  @Column({ type: 'text', nullable: true })
  specialRequests: string;

  @Column({ type: 'text', nullable: true })
  cancellationReason: string;

  @Column({ type: 'varchar', nullable: true })
  paymentMethod: string;

  @Column({ type: 'text', nullable: true })
  paymentReference: string;

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  commissionAmount: number;

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  hostPayoutAmount: number;

  @Column({ type: 'text', nullable: true })
  paymentExpiry: string;

  @Column({ default: false })
  escrowHeld: boolean;

  // Refund fields
  @Column({ default: RefundStatus.NONE })
  refundStatus: string;

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  refundAmount: number;

  @Column({ type: 'text', nullable: true })
  refundReason: string;

  @Column({ type: 'text', nullable: true })
  refundProcessedAt: Date;

  @Column({ type: 'text', nullable: true })
  refundReference: string;

  @Index()
  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
