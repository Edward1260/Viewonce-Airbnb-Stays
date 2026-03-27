import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';
import { Unit } from './unit.entity';

export enum BuildingStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  ARCHIVED = 'archived',
}

@Entity('buildings')
export class Building {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  hostId: string;

  @ManyToOne(() => User, { eager: false })
  @JoinColumn({ name: 'hostId' })
  host: User;

  @Column()
  name: string;

  @Column({ nullable: true })
  description: string;

  @Column()
  location: string;

  @Column({ type: 'decimal', precision: 10, scale: 8, nullable: true })
  latitude?: number;

  @Column({ type: 'decimal', precision: 11, scale: 8, nullable: true })
  longitude?: number;

  @Column({ nullable: true })
  address: string;

  @Column({ 
    type: 'text', 
    array: true, 
    default: () => [] 
  })
  compoundImages: string[];

  @Column('jsonb', { default: '[]' })
  amenities: any[]; // {id: string, name: string, icon: string}[]

  @Column({ nullable: true })
  houseRules?: string;

  @Column({
    type: 'enum',
    enum: BuildingStatus,
    default: BuildingStatus.PENDING,
  })
  status: BuildingStatus;

  @OneToMany(() => Unit, (unit) => unit.building, { cascade: true })
  units: Unit[];

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
