import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';

@Entity('ai_conversations')
export class AiConversation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column('jsonb', { default: [] })
  history: { role: 'user' | 'assistant', content: string, timestamp: string }[];

  @Column({ nullable: true })
  lastIntent: string;

  @CreateDateColumn()
  createdAt: Date;
}