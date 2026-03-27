import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Unit } from './unit.entity';

export enum AvailabilityStatus {
  AVAILABLE = 'available',
  BOOKED = 'booked',
  BLOCKED = 'blocked',
  MAINTENANCE = 'maintenance',
}

@Entity('unit_availability')
export class UnitAvailability {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  unitId: string;

  @ManyToOne(() => Unit, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'unitId' })
  unit: Unit;

  @Column({ type: 'date' })
  date: string; // YYYY-MM-DD

  @Column({
    type: 'enum',
    enum: AvailabilityStatus,
    default: AvailabilityStatus.AVAILABLE,
  })
  status: AvailabilityStatus;

  @Column({ 
    type: 'decimal', 
    precision: 10, scale: 2, 
    nullable: true 
  })
  priceOverride?: number; // Dynamic pricing for special dates

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
