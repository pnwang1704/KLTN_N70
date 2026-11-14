import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { columnNumericTransformer } from '../../common/transformers/numeric.transformer';

@Entity('toppings')
export class Topping {
  @PrimaryColumn('varchar', { length: 64 })
  id: string;

  @Column()
  name: string;

  @Column('decimal', { precision: 10, scale: 2, transformer: columnNumericTransformer })
  price: number;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

