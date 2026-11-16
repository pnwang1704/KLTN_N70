import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

export enum InventoryTransactionType {
  ORDER_DEDUCT = 'ORDER_DEDUCT',
  ORDER_RESTORE = 'ORDER_RESTORE',
  MANUAL_IMPORT = 'MANUAL_IMPORT',
  MANUAL_ADJUST = 'MANUAL_ADJUST',
}

@Entity('inventory_transactions')
export class InventoryTransaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ default: '1' })
  branchId: string;

  @Column()
  itemId: string; // ingredientId

  @Column({ nullable: true })
  ingredientId: string;

  @Column({ nullable: true })
  itemName: string;

  @Column({ nullable: true })
  unit: string;

  @Column({ nullable: true })
  orderId: string;

  @Column({ type: 'varchar', nullable: true })
  orderCode: string;

  @Column('decimal', { precision: 10, scale: 2 })
  changeQuantity: number; // âm khi xuất bán (-), dương khi hoàn trả/nhập kho (+)

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  changeAmount: number;

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  balanceAfter: number;

  @Column({
    type: 'varchar',
    default: InventoryTransactionType.MANUAL_IMPORT,
  })
  type: InventoryTransactionType;

  @Column({ type: 'text', nullable: true })
  note: string;

  @CreateDateColumn()
  createdAt: Date;
}
