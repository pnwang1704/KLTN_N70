import { Entity, PrimaryGeneratedColumn, Column, Unique } from 'typeorm';

@Entity()
@Unique(['branchId', 'ingredientId'])
export class Stock {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  branchId: string;

  @Column()
  ingredientId: string;

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  currentQuantity: number;
}
