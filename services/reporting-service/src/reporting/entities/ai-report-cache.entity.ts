import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('ai_report_cache')
export class AiReportCache {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  cacheKey: string;

  @Column({ type: 'text' })
  summaryContent: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
