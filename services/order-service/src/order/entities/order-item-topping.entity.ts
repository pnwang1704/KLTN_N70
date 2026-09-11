import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { OrderItem } from './order-item.entity';
import { columnNumericTransformer } from '../../common/transformers/numeric.transformer';

@Entity()
export class OrderItemTopping {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  toppingId: string;

  @Column()
  toppingName: string;

  @Column('decimal', { precision: 10, scale: 2, transformer: columnNumericTransformer })
  price: number;

  @Column()
  quantity: number;

  @ManyToOne(() => OrderItem, orderItem => orderItem.toppings, { onDelete: 'CASCADE' })
  orderItem: OrderItem;
}
