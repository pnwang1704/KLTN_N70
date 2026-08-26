import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany, OneToOne } from 'typeorm';
import { OrderItem } from './order-item.entity';
import { Payment } from './payment.entity';

export enum OrderType {
  AT_TABLE = 'AT_TABLE',
  TAKE_AWAY = 'TAKE_AWAY',
}

export enum OrderStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

@Entity()
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  branchId: string;

  @Column({ nullable: true })
  tableId: string;

  @Column({ type: 'bigint', nullable: true })
  orderCode: number;

  @Column({
    type: 'enum',
    enum: OrderType,
    default: OrderType.AT_TABLE,
  })
  orderType: OrderType;

  @Column({
    type: 'enum',
    enum: OrderStatus,
    default: OrderStatus.PENDING,
  })
  status: OrderStatus;

  @Column('decimal', { precision: 10, scale: 2 })
  totalAmount: number;

  @Column('decimal', { precision: 10, scale: 2 })
  finalAmount: number;

  @OneToMany(() => OrderItem, item => item.order, { cascade: true })
  items: OrderItem[];

  @OneToOne(() => Payment, payment => payment.order, { cascade: true })
  payment: Payment;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
