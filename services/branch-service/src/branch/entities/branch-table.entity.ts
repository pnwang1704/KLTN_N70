import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Branch } from './branch.entity';

export enum TableStatus {
  AVAILABLE = 'AVAILABLE',
  OCCUPIED = 'OCCUPIED',
}

@Entity('branch_tables')
export class BranchTable {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  branchId: string;

  @Column({ nullable: true })
  tableNumber: string; // '1', '2', ... dùng làm tableId chuẩn cho QR và Order

  @Column()
  name: string; // Bàn 01, Bàn 02...

  @Column({ default: 'Tầng 1' })
  area: string; // Tầng 1, Tầng 2, Sân vườn...

  @Column({ type: 'int', default: 4 })
  capacity: number;

  @Column({
    type: 'varchar',
    default: TableStatus.AVAILABLE,
  })
  status: TableStatus;

  @ManyToOne(() => Branch, (branch) => branch.tables, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'branchId' })
  branch: Branch;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
