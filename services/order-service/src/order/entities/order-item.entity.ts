import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany } from 'typeorm';
import { Order } from './order.entity';
import { OrderItemTopping } from './order-item-topping.entity';

export enum ItemStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
}

@Entity()
export class OrderItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  productId: string;

  @Column()
  productName: string;

  @Column({ nullable: true })
  size: string;

  @Column()
  quantity: number;

  @Column('decimal', { precision: 10, scale: 2 })
  unitPrice: number;

  @Column({ nullable: true })
  note: string;

  @Column({
    type: 'enum',
    enum: ItemStatus,
    default: ItemStatus.PENDING,
  })
  itemStatus: ItemStatus;

  @ManyToOne(() => Order, order => order.items, { onDelete: 'CASCADE' })
  order: Order;

  @OneToMany(() => OrderItemTopping, topping => topping.orderItem, { cascade: true })
  toppings: OrderItemTopping[];
}
