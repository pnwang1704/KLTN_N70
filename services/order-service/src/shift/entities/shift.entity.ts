import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('shifts')
export class Shift {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', nullable: true })
  branchId?: string | null;

  @Column({ unique: true })
  code: string;

  @Column()
  name: string;

  @Column({ length: 5 })
  startTime: string;

  @Column({ length: 5 })
  endTime: string;

  @Column({ type: 'int', default: 15 })
  gracePeriodMinutes: number;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
