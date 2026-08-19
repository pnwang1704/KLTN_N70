import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity()
export class Ingredient {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column()
  unit: string;

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  minStockThreshold: number;
}
