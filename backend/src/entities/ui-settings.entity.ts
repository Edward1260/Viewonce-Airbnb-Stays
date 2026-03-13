import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('ui_settings')
export class UiSettings {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  userId: string; // For user-specific settings, null for global admin settings

  @Column({ type: 'json', nullable: true })
  colors: {
    background: string;
    card: string;
    accent: string;
    accent2: string;
    text: string;
    textSecondary: string;
    muted: string;
    border: string;
    success: string;
    error: string;
    warn: string;
    info: string;
  };

  @Column({ type: 'json', nullable: true })
  theme: {
    name: string;
    isDark: boolean;
    customCss?: string;
  };

  @Column({ type: 'boolean', default: false })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
