import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from './user.entity';
import { Booking } from './booking.entity';
import { Review } from './review.entity';
import { CancellationPolicy } from './cancellation-policy.entity';

export enum PropertyStatus {
  ACTIVE = 'active',
  PENDING = 'pending',
  SUSPENDED = 'suspended',
  INACTIVE = 'inactive',
}

export enum PropertyType {
  APARTMENT = 'Apartment',
  HOUSE = 'House',
  VILLA = 'Villa',
  STUDIO = 'Studio',
  HOTEL_ROOM = 'Hotel Room',
  COTTAGE = 'Cottage',
  LODGE = 'Lodge',
  BUNGALOW = 'Bungalow',
  TOWNHOUSE = 'Townhouse',
  CABIN = 'Cabin',
  LOFT = 'Loft',
  SUITE = 'Suite',
  GUEST_HOUSE = 'Guest House',
}

@Entity('properties')
export class Property {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Index()
  @Column()
  location: string;

  @Index()
  @Column('decimal', { precision: 10, scale: 2 })
  price: number;

  @Index()
  @Column({
    type: 'varchar',
    default: PropertyType.APARTMENT,
  })
  type: string;

  @Index()
  @Column({
    type: 'varchar',
    default: PropertyStatus.PENDING,
  })
  status: string;

  @Column('int')
  bedrooms: number;

  @Column('int')
  bathrooms: number;

  @Column('int')
  maxGuests: number;

  @Column('json', { nullable: true })
  amenities: string[];

  @Column('json', { nullable: true })
  images: string[];

  @Column('json', { nullable: true })
  videos: string[];

  @Index()
  @Column('decimal', { precision: 3, scale: 1, default: 0 })
  rating: number;

  @Column('int', { default: 0 })
  reviewCount: number;

  // ✅ Keep hostId column for DB efficiency
  @Index()
  @Column({ nullable: true })
  hostId: string;

  @ManyToOne(() => User, user => user.properties, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'hostId' })
  host: User;

  @OneToMany(() => Booking, booking => booking.property)
  bookings: Booking[];

  @OneToMany(() => Review, review => review.property)
  reviews: Review[];

  @Column({ nullable: true })
  cancellationPolicyId: string;

  @ManyToOne(() => CancellationPolicy, policy => policy.properties, { nullable: true })
  @JoinColumn({ name: 'cancellationPolicyId' })
  cancellationPolicy: CancellationPolicy;

  @Index()
  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ nullable: true })
  suspensionReason: string;
}
