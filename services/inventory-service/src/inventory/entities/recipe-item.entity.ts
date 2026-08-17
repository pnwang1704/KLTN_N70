import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { Recipe } from './recipe.entity';

@Entity()
export class RecipeItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  ingredientId: string;

  @Column('decimal', { precision: 10, scale: 2 })
  quantityNeeded: number;

  @ManyToOne(() => Recipe, recipe => recipe.items, { onDelete: 'CASCADE' })
  recipe: Recipe;
}
