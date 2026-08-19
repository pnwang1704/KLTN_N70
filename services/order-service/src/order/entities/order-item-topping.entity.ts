import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { OrderItem } from './order-item.entity';

@Entity()
export class OrderItemTopping {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  toppingId: string;

  @Column()
  toppingName: string;

  @Column('decimal', { precision: 10, scale: 2 })
  price: number;

  @Column()
  quantity: number;

  @ManyToOne(() => OrderItem, orderItem => orderItem.toppings, { onDelete: 'CASCADE' })
  orderItem: OrderItem;
}
