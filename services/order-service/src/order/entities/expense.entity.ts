import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';
import { columnNumericTransformer } from '../../common/transformers/numeric.transformer';

@Entity('expenses')
export class Expense {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  branchId: string;

  @Column()
  cashierId: string;

  @Column('decimal', { precision: 12, scale: 2, transformer: columnNumericTransformer })
  amount: number;

  @Column()
  reason: string;

  @Column({ nullable: true })
  note: string;

  @CreateDateColumn()
  createdAt: Date;
}
