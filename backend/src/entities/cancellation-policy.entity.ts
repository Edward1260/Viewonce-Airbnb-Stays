import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { User } from './user.entity';
import { Property } from './property.entity';

export enum CancellationPolicyType {
  FLEXIBLE = 'flexible',
  MODERATE = 'moderate',
  STRICT = 'strict',
  SUPER_STRICT = 'super_strict'
}

@Entity('cancellation_policies')
export class CancellationPolicy {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  hostId: string;

  @ManyToOne(() => User, user => user.properties, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'hostId' })
  host: User;

  @Column({ default: CancellationPolicyType.FLEXIBLE })
  type: string;

  @Column({ type: 'text' })
  name: string;

  @Column({ type: 'text' })
  description: string;

  @Column('int', { default: 0 })
  freeCancellationDays: number; // Days before check-in for free cancellation

  @Column('decimal', { precision: 5, scale: 2, default: 0 })
  refundPercentage: number; // Percentage refunded after free period

  @Column('int', { default: 0 })
  noRefundDays: number; // Days before check-in with no refund

  @Column({ default: true })
  isActive: boolean;

  @OneToMany(() => Property, property => property.cancellationPolicy)
  properties: Property[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
