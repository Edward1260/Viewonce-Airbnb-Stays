import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { Building } from './building.entity';
import { UnitAvailability } from './unit-availability.entity';

export enum UnitStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  MAINTENANCE = 'maintenance',
}

@Entity('units')
export class Unit {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  buildingId: string;

  @ManyToOne(() => Building, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'buildingId' })
  building: Building;

  @Column()
  unitNumber: string;

  @Column({ nullable: true })
  floorNumber?: number;

  @Column({ default: 1 })
  bedrooms: number;

  @Column({ type: 'decimal', precision: 3, scale: 1, default: 1.0 })
  bathrooms: number;

  @Column('jsonb', { default: '{}' })
  furnishing: Record<string, boolean>; // {kitchen: true, wifi: true, ac: true, ...}

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  basePrice: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  deposit: number;

  @Column('jsonb', { default: '{}' })
  discounts: Record<string, number>; // {weekend: 0.9, monthly: 0.8, long_stay: 0.85}

  @Column({ 
    type: 'text', 
    array: true, 
    default: () => [] 
  })
  images: string[];

  @Column({ default: 2 })
  maxGuests: number;

  @Column({
    type: 'enum',
    enum: UnitStatus,
    default: UnitStatus.PENDING,
  })
  status: UnitStatus;

  @Column({ nullable: true })
  description?: string;

  @OneToMany(() => UnitAvailability, (availability) => availability.unit, { cascade: true })
  availability: UnitAvailability[];

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
