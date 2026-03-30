import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { User } from './user.entity'; // Assuming User entity path
import { Property } from './property.entity'; // Assuming Property entity path

@Entity('reviews')
export class Review {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'int' })
  rating: number; // e.g., 1 to 5 stars

  @Column({ type: 'text' })
  text: string;

  @ManyToOne(() => User, user => user.reviews, { onDelete: 'CASCADE' })
  user: User;

  @Column()
  userId: string; // Foreign key for User

  @ManyToOne(() => Property, property => property.reviews, { onDelete: 'CASCADE' })
  property: Property;

  @Column()
  propertyId: string; // Foreign key for Property

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}