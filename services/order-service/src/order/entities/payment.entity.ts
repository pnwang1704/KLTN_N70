import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, OneToOne, JoinColumn } from 'typeorm';
import { Order } from './order.entity';
import { columnNumericTransformer } from '../../common/transformers/numeric.transformer';

export enum PaymentMethod {
  CASH = 'CASH',
  BANK_TRANSFER = 'BANK_TRANSFER',
}

@Entity()
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: PaymentMethod,
  })
  paymentMethod: PaymentMethod;

  @Column('decimal', { precision: 10, scale: 2, transformer: columnNumericTransformer })
  amount: number;

  @CreateDateColumn()
  paidAt: Date;

  @OneToOne(() => Order, order => order.payment, { onDelete: 'CASCADE' })
  @JoinColumn()
  order: Order;
}
