import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { columnNumericTransformer } from '../../common/transformers/numeric.transformer';

export interface ProductSizeItem {
  id: string;
  name: string;
  priceModifier: number;
}

export interface ProductToppingItem {
  id: string;
  name: string;
  price: number;
}

@Entity('products')
export class Product {
  @PrimaryColumn('varchar', { length: 64 })
  id: string;

  @Column()
  categoryId: string;

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column('decimal', { precision: 10, scale: 2, transformer: columnNumericTransformer })
  basePrice: number;

  @Column({ type: 'text', nullable: true })
  imageUrl: string;

  @Column({ type: 'jsonb', default: [] })
  sizes: ProductSizeItem[];

  @Column({ type: 'jsonb', default: [] })
  availableToppings: ProductToppingItem[];

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

