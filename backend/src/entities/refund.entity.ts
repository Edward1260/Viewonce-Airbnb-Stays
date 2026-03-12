import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Booking } from './booking.entity';
import { User } from './user.entity';

export enum RefundStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  PROCESSED = 'processed',
  REJECTED = 'rejected',
  CANCELLED = 'cancelled'
}

@Entity('refunds')
export class Refund {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  bookingId: string;

  @ManyToOne(() => Booking, booking => booking.id, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'bookingId' })
  booking: Booking;

  @Column()
  userId: string; // Guest requesting refund

  @ManyToOne(() => User, user => user.id, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column('decimal', { precision: 10, scale: 2 })
  amount: number;

  @Column('decimal', { precision: 10, scale: 2 })
  originalAmount: number; // Original booking amount

  @Column({ default: RefundStatus.PENDING })
  status: string;

  @Column({ type: 'text', nullable: true })
  reason: string;

  @Column({ type: 'text', nullable: true })
  adminNotes: string;

  @Column({ type: 'text', nullable: true })
  processedBy: string; // Admin user ID who processed

  @Column({ type: 'text', nullable: true })
  paymentReference: string;

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  processingFee: number;

  @Column({ type: 'text', nullable: true })
  refundMethod: string; // Original payment method

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ type: 'text', nullable: true })
  processedAt: Date;
}
