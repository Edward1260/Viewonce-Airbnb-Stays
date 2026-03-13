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

export enum LiveTourStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

@Entity('live_tours')
export class LiveTour {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column()
  videoUrl: string;

  @Column({ nullable: true })
  thumbnailUrl: string;

  @Column()
  location: string;

  @Column('decimal', { precision: 3, scale: 1, default: 0 })
  rating: number;

  @Column({
    type: 'varchar',
    default: LiveTourStatus.ACTIVE,
  })
  status: string;

  @Column({ nullable: true })
  adminId: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'adminId' })
  admin: User;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
