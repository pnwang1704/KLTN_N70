import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('report_snapshots')
export class ReportSnapshot {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ default: 'ALL' })
  branchId: string;

  @Column({ nullable: true })
  startDate: string;

  @Column({ nullable: true })
  endDate: string;

  @Column('decimal', { precision: 14, scale: 2, default: 0 })
  netRevenue: number;

  @Column('decimal', { precision: 14, scale: 2, default: 0 })
  estimatedCogs: number;

  @Column('decimal', { precision: 14, scale: 2, default: 0 })
  grossProfit: number;

  @Column({ type: 'int', default: 0 })
  totalOrders: number;

  @Column({ type: 'int', default: 0 })
  voidedCount: number;

  @Column('decimal', { precision: 14, scale: 2, default: 0 })
  voidedAmount: number;

  @CreateDateColumn()
  createdAt: Date;
}
